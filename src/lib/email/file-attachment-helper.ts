import { supabaseAdmin } from '@/lib/supabase';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

/**
 * Download files from Supabase storage and prepare them for email attachments
 */
export async function prepareFileAttachmentsFromUrls(fileUrls: string[]): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = [];
  
  for (const fileUrl of fileUrls) {
    try {
      // Extract bucket and file path from Supabase URL
      const url = new URL(fileUrl);
      const pathSegments = url.pathname.split('/');
      
      // Find bucket and file path in URL structure
      // Typical structure: /storage/v1/object/public/uploads/filename
      const bucketIndex = pathSegments.indexOf('public') + 1;
      if (bucketIndex <= 0 || bucketIndex >= pathSegments.length) {
        console.warn(`Unable to parse Supabase URL structure: ${fileUrl}`);
        continue;
      }
      
      const bucket = pathSegments[bucketIndex];
      const filePath = pathSegments.slice(bucketIndex + 1).join('/');
      
      console.log(`📎 Downloading file: ${bucket}/${filePath}`);
      
      // Download file from Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .download(filePath);
      
      if (error) {
        console.error(`Failed to download file ${filePath}:`, error);
        continue;
      }
      
      if (!data) {
        console.warn(`No data received for file ${filePath}`);
        continue;
      }
      
      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Extract filename from path
      const filename = filePath.split('/').pop() || 'attachment';
      
      // Determine content type based on file extension
      const contentType = getContentTypeFromFilename(filename);
      
      attachments.push({
        filename,
        content: buffer,
        contentType
      });
      
      console.log(`✅ File prepared for attachment: ${filename} (${buffer.length} bytes)`);
      
    } catch (error) {
      console.error(`Error preparing attachment from ${fileUrl}:`, error);
      // Continue with other files even if one fails
      continue;
    }
  }
  
  return attachments;
}

/**
 * Get content type based on file extension
 */
function getContentTypeFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    
    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    
    // Design files
    'ai': 'application/illustrator',
    'eps': 'application/postscript',
    'psd': 'application/photoshop',
    'sketch': 'application/sketch',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/rar',
    '7z': 'application/x-7z-compressed',
    
    // Office documents
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Filter and limit attachments for email
 * Most email providers have size limits (typically 25MB)
 */
export function filterAttachmentsForEmail(
  attachments: EmailAttachment[], 
  maxTotalSize: number = 20 * 1024 * 1024, // 20MB limit
  maxFileSize: number = 10 * 1024 * 1024   // 10MB per file limit
): {
  validAttachments: EmailAttachment[];
  skippedFiles: string[];
  totalSize: number;
} {
  const validAttachments: EmailAttachment[] = [];
  const skippedFiles: string[] = [];
  let totalSize = 0;
  
  for (const attachment of attachments) {
    const fileSize = Buffer.isBuffer(attachment.content) 
      ? attachment.content.length 
      : Buffer.byteLength(attachment.content, 'utf8');
    
    // Skip files that are too large individually
    if (fileSize > maxFileSize) {
      skippedFiles.push(`${attachment.filename} (${Math.round(fileSize / 1024 / 1024)}MB - too large)`);
      continue;
    }
    
    // Skip if adding this file would exceed total size limit
    if (totalSize + fileSize > maxTotalSize) {
      skippedFiles.push(`${attachment.filename} (would exceed size limit)`);
      continue;
    }
    
    validAttachments.push(attachment);
    totalSize += fileSize;
  }
  
  return {
    validAttachments,
    skippedFiles,
    totalSize
  };
}

/**
 * Create attachment info summary for email content
 */
export function createAttachmentSummary(
  validAttachments: EmailAttachment[],
  skippedFiles: string[]
): string {
  if (validAttachments.length === 0 && skippedFiles.length === 0) {
    return '';
  }
  
  let summary = '';
  
  if (validAttachments.length > 0) {
    const totalSize = validAttachments.reduce((sum, att) => {
      const size = Buffer.isBuffer(att.content) 
        ? att.content.length 
        : Buffer.byteLength(att.content, 'utf8');
      return sum + size;
    }, 0);
    
    summary += `\n\n📎 **Attachments (${validAttachments.length} files, ${Math.round(totalSize / 1024)}KB total):**\n`;
    summary += validAttachments.map(att => `- ${att.filename}`).join('\n');
  }
  
  if (skippedFiles.length > 0) {
    summary += `\n\n⚠️ **Files not attached (size limits):**\n`;
    summary += skippedFiles.map(file => `- ${file}`).join('\n');
    summary += `\n*Large files can be accessed through the admin dashboard.*`;
  }
  
  return summary;
}