import { supabase } from '@/core/config/client';
import { FileUploadItem } from '@/components/ui/file-upload';

export interface TaskAttachment {
  id: string;
  task_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface UploadResult {
  success: boolean;
  attachment?: TaskAttachment;
  error?: string;
}

export class FileUploadService {
  /**
   * Upload a file to the project-files bucket and create a task attachment record
   */
  static async uploadTaskAttachment(
    taskId: string,
    file: FileUploadItem
  ): Promise<UploadResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'მომხმარებელი არ არის ავთენტიფიცირებული' };
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFilename = file.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `tasks/${taskId}/${timestamp}_${sanitizedFilename}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file.file);

      if (uploadError) {
        console.error('File upload error:', uploadError);
        return { success: false, error: `ფაილის ატვირთვის შეცდომა: ${uploadError.message}` };
      }

      // Create attachment record in database
      const { data: attachmentData, error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          filename: file.file.name,
          file_path: uploadData.path,
          file_size: file.file.size,
          file_type: file.file.type,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        
        // Try to clean up uploaded file if DB insert fails
        await supabase.storage
          .from('project-files')
          .remove([uploadData.path]);

        return { success: false, error: `მონაცემთა ბაზის შეცდომა: ${dbError.message}` };
      }

      return {
        success: true,
        attachment: attachmentData as TaskAttachment
      };

    } catch (error) {
      console.error('Unexpected upload error:', error);
      return { success: false, error: 'მოულოდნელი შეცდომა ფაილის ატვირთვისას' };
    }
  }

  /**
   * Upload multiple files for a task
   */
  static async uploadTaskAttachments(
    taskId: string,
    files: FileUploadItem[]
  ): Promise<{ results: UploadResult[]; allSucceeded: boolean }> {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadTaskAttachment(taskId, file);
      results.push(result);
    }

    const allSucceeded = results.every(result => result.success);
    
    return { results, allSucceeded };
  }

  /**
   * Get all attachments for a task
   */
  static async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching task attachments:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Delete a task attachment
   */
  static async deleteTaskAttachment(attachmentId: string): Promise<boolean> {
    try {
      // First get the attachment to get file path
      const { data: attachment, error: fetchError } = await supabase
        .from('task_attachments')
        .select('file_path')
        .eq('id', attachmentId)
        .single();

      if (fetchError) {
        console.error('Error fetching attachment:', fetchError);
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with DB deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) {
        console.error('Error deleting attachment record:', dbError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting attachment:', error);
      return false;
    }
  }

  /**
   * Get download URL for a file
   */
  static async getFileDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}