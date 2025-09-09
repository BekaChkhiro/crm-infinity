import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { FileUpload, FileUploadItem } from '@/components/ui/file-upload';
import { FileUploadService, TaskAttachment } from '@/services/fileUploadService';
import { useToast } from '@/shared/hooks/use-toast';
import { 
  Paperclip, 
  Download, 
  Trash2, 
  File, 
  Image, 
  FileText, 
  Music, 
  Video, 
  Archive,
  Plus,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskAttachmentsTabProps {
  taskId: string;
  teamMembers: Array<{ id: string; name: string }>;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) 
    return <FileText className="h-4 w-4" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z'))
    return <Archive className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

export function TaskAttachmentsTab({ taskId, teamMembers }: TaskAttachmentsTabProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  // Load attachments
  const loadAttachments = async () => {
    setLoading(true);
    try {
      const data = await FileUploadService.getTaskAttachments(taskId);
      setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast({
        title: 'შეცდომა',
        description: 'ფაილების ჩატვირთვა ვერ მოხერხდა',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  // Handle file upload
  const handleFileUpload = async (files: FileUploadItem[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const { results, allSucceeded } = await FileUploadService.uploadTaskAttachments(taskId, files);

      if (allSucceeded) {
        toast({
          title: 'წარმატება',
          description: `${files.length} ფაილი წარმატებით აიტვირთა`,
        });
        setShowUpload(false);
        loadAttachments();
      } else {
        const failedUploads = results.filter(r => !r.success);
        toast({
          title: 'გაფრთხილება',
          description: `${results.length - failedUploads.length} ფაილი აიტვირთა, ${failedUploads.length} ვერ`,
          variant: 'default',
        });
        loadAttachments();
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'შეცდომა',
        description: 'ფაილების ატვირთვა ვერ მოხერხდა',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle file download
  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const url = await FileUploadService.getFileDownloadUrl(attachment.file_path);
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Failed to generate download URL');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'შეცდომა',
        description: 'ფაილის ჩამოტვირთვა ვერ მოხერხდა',
        variant: 'destructive'
      });
    }
  };

  // Handle file deletion
  const handleDelete = async (attachmentId: string) => {
    if (!confirm('ნამდვილად გსურთ ამ ფაილის წაშლა?')) return;

    try {
      const success = await FileUploadService.deleteTaskAttachment(attachmentId);
      if (success) {
        toast({
          title: 'წარმატება',
          description: 'ფაილი წარმატებით წაიშალა',
        });
        loadAttachments();
      } else {
        throw new Error('Delete operation failed');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: 'შეცდომა',
        description: 'ფაილის წაშლა ვერ მოხერხდა',
        variant: 'destructive'
      });
    }
  };

  const getUserName = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    return member?.name || 'უცნობი მომხმარებელი';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">ფაილები და დანართები</h3>
          <Badge variant="secondary">{attachments.length}</Badge>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          ფაილის დამატება
        </Button>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />
              ახალი ფაილის ატვირთვა
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesChange={handleFileUpload}
              maxFiles={5}
              maxSize={10 * 1024 * 1024} // 10MB
              accept="*/*"
              multiple
              disabled={uploading}
            />
            {uploading && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full"></div>
                ფაილების ატვირთვა...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-12">
          <Paperclip className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-muted-foreground mb-2">
            ფაილები არ არის მიბმული
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            დაამატეთ ფაილები ამ დავალებისთვის
          </p>
          <Button 
            onClick={() => setShowUpload(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            პირველი ფაილის დამატება
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    {getFileIcon(attachment.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{attachment.filename}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{FileUploadService.formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>{getUserName(attachment.uploaded_by)}</span>
                      <span>•</span>
                      <span>{format(new Date(attachment.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ჩამოტვირთვა
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    წაშლა
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}