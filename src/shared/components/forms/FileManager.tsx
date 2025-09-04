import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/shared/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Upload, File, Download, Trash2, Search, MoreVertical, FileText, Image as ImageIcon, Video, Music, Eye, Filter, Grid, List, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';

interface ProjectFile {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
  project_id: string;
}

interface FileManagerProps {
  projectId: string;
  teamMembers: Array<{ id: string; name: string }>;
}

export function FileManager({ projectId, teamMembers }: FileManagerProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [imageThumbnails, setImageThumbnails] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  useEffect(() => {
    // Load thumbnails for image files
    const loadThumbnails = async () => {
      const imageFiles = files.filter(file => file.file_type.startsWith('image/'));
      
      for (const file of imageFiles) {
        if (!imageThumbnails[file.id]) {
          try {
            const { data, error } = await supabase.storage
              .from('project-files')
              .download(file.file_path);
              
            if (!error && data) {
              const url = URL.createObjectURL(data);
              setImageThumbnails(prev => ({
                ...prev,
                [file.id]: url
              }));
            }
          } catch (err) {
            console.error('Error loading thumbnail:', err);
          }
        }
      }
    };

    if (files.length > 0) {
      loadThumbnails();
    }
  }, [files, imageThumbnails]);

  // Cleanup thumbnail URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageThumbnails).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      toast({
        title: "Error",
        description: "Failed to load project files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}-${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Simulate progress for UX
      setUploadProgress(100);

      // Save file metadata to database
      const { data: fileData, error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: user.id,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_activity_type: 'file_uploaded',
        p_description: `Uploaded file "${file.name}"`,
        p_entity_type: 'file',
        p_entity_id: fileData?.id || null
      });

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      fetchFiles();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File select triggered', event.target.files);
    const files = Array.from(event.target.files || []);
    console.log('Files to upload:', files);
    files.forEach(handleFileUpload);
    event.target.value = '';
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    files.forEach(handleFileUpload);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDownload = async (file: ProjectFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      fetchFiles();
    } catch (err: any) {
      console.error('Error deleting file:', err);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
    setDeleteFileId(null);
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.file_type.startsWith('image/') && imageThumbnails[file.id]) {
      return (
        <div className="w-8 h-8 rounded overflow-hidden">
          <img 
            src={imageThumbnails[file.id]} 
            alt={file.filename}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    if (file.file_type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (file.file_type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (file.file_type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (file.file_type.includes('pdf') || file.file_type.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeCategory = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'images';
    if (fileType.startsWith('video/')) return 'videos';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return 'documents';
    return 'other';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFiles();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Files refreshed successfully",
    });
  };

  const handlePreview = async (file: ProjectFile) => {
    if (file.file_type.startsWith('image/') || file.file_type === 'application/pdf') {
      setPreviewFile(file);
    } else {
      // For non-previewable files, just download them
      handleDownload(file);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = fileTypeFilter === 'all' || getFileTypeCategory(file.file_type) === fileTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalSize = files.reduce((acc, file) => acc + file.file_size, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <File className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Project Files</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {files.length} files ({formatFileSize(totalSize)})
          </Badge>
          <label>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <Button disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </label>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="videos">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none border-r"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Drag and Drop Area */}
      <Card 
        className={`border-2 border-dashed transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Drag and drop files here</p>
            <p className="text-sm">or click the Upload Files button above</p>
            <p className="text-xs mt-2">Maximum file size: 10MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {files.length === 0 ? (
                <div>
                  <p className="text-lg font-medium">No files uploaded yet</p>
                  <p className="text-sm">Upload your first file to get started</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">No files match your search</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate" title={file.filename}>
                        {file.filename}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(file.file_type.startsWith('image/') || file.file_type === 'application/pdf') && (
                        <>
                          <DropdownMenuItem onClick={() => handlePreview(file)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteFileId(file.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>
                    Uploaded by {teamMembers.find(m => m.id === file.uploaded_by)?.name || 'Unknown'}
                  </div>
                  <div>
                    {format(new Date(file.created_at), 'MMM dd, yyyy - HH:mm')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="animate-fade-in">
          <CardContent className="p-0">
            <div className="space-y-0">
              {filteredFiles.map((file, index) => (
                <div 
                  key={file.id} 
                  className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                    index !== filteredFiles.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(file)}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm truncate" title={file.filename}>
                        {file.filename}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span>
                          Uploaded by {teamMembers.find(m => m.id === file.uploaded_by)?.name || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span>{format(new Date(file.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeCategory(file.file_type)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(file.file_type.startsWith('image/') || file.file_type === 'application/pdf') && (
                          <>
                            <DropdownMenuItem onClick={() => handlePreview(file)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteFileId(file.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteFileId && handleDelete(deleteFileId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile && getFileIcon(previewFile)}
              {previewFile?.filename}
            </DialogTitle>
          </DialogHeader>
          
          {previewFile && (
            <div className="flex-1 overflow-auto">
              <FilePreview file={previewFile} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// File Preview Component
function FilePreview({ file }: { file: ProjectFile }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: downloadError } = await supabase.storage
          .from('project-files')
          .download(file.file_path);

        if (downloadError) throw downloadError;

        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      } catch (err: any) {
        console.error('Error loading preview:', err);
        setError('Failed to load file preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!previewUrl) return null;

  if (file.file_type.startsWith('image/')) {
    return (
      <div className="flex justify-center">
        <img 
          src={previewUrl} 
          alt={file.filename}
          className="max-w-full max-h-[60vh] object-contain rounded-lg"
        />
      </div>
    );
  }

  if (file.file_type === 'application/pdf') {
    return (
      <iframe
        src={previewUrl}
        className="w-full h-[60vh] border rounded-lg"
        title={file.filename}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="text-center">
        <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Preview not available for this file type</p>
      </div>
    </div>
  );
}