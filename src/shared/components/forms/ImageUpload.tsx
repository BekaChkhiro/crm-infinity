import React, { useState, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Upload, X, Camera, Trash2 } from 'lucide-react';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpload: (file: File) => Promise<{ error: any; url?: string }>;
  onImageDelete: () => Promise<{ error: any }>;
  loading?: boolean;
  userName?: string;
}

export function ImageUpload({ 
  currentImageUrl, 
  onImageUpload, 
  onImageDelete,
  loading = false,
  userName = 'User'
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    onImageUpload(file);
  };

  const handleDeleteImage = async () => {
    setPreviewUrl(null);
    await onImageDelete();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const displayImageUrl = previewUrl || currentImageUrl;
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Picture
        </CardTitle>
        <CardDescription>
          Choose a profile picture. Supported formats: JPEG, PNG, WebP with maximum size of 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar Preview */}
        <div className="flex items-center justify-center">
          <Avatar className="w-32 h-32">
            <AvatarImage src={displayImageUrl || undefined} alt="Profile picture" />
            <AvatarFallback className="text-2xl">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {loading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner className="mr-2" />
              Uploading...
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Drop image here, or{' '}
                  <button
                    type="button"
                    onClick={openFileDialog}
                    className="text-primary hover:underline"
                  >
                    browse files
                  </button>
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP up to 5MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={loading}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose File
          </Button>
          
          {displayImageUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteImage}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}