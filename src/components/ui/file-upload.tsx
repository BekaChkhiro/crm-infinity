import React, { useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Upload, X, File, Image, FileText, Music, Video, Archive } from 'lucide-react';
import { cn } from '@/shared/utils/utils';

export interface FileUploadItem {
  file: File;
  id: string;
  preview?: string;
}

interface FileUploadProps {
  onFilesChange: (files: FileUploadItem[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
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

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept,
  multiple = true,
  disabled = false,
  className,
  children
}: FileUploadProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList) => {
    const newFiles: FileUploadItem[] = [];
    let hasError = false;

    Array.from(fileList).forEach((file) => {
      // Check file size
      if (file.size > maxSize) {
        setError(`ფაილი "${file.name}" ძალიან დიდია. მაქსიმუმ ${formatFileSize(maxSize)}`);
        hasError = true;
        return;
      }

      // Check if we're exceeding max files
      if (files.length + newFiles.length >= maxFiles) {
        setError(`მაქსიმუმ ${maxFiles} ფაილის ატვირთვაა შესაძლებელი`);
        hasError = true;
        return;
      }

      const fileItem: FileUploadItem = {
        file,
        id: `${Date.now()}-${Math.random()}`,
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileItem.preview = e.target?.result as string;
          setFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(fileItem);
    });

    if (!hasError) {
      setError(null);
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    }
  };

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

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      processFiles(droppedFiles);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(item => item.id !== id);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed",
          "focus-within:border-blue-500 focus-within:bg-blue-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {children || (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Upload className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                დააჭირეთ ფაილის ასარჩევად ან ჩააგდეთ აქ
              </p>
              <p className="text-xs text-gray-500">
                მაქსიმუმ {maxFiles} ფაილი, თითოეული {formatFileSize(maxSize)}-მდე
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleButtonClick}
              disabled={disabled}
            >
              ფაილის არჩევა
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            არჩეული ფაილები ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      {getFileIcon(item.file.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(item.id)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}