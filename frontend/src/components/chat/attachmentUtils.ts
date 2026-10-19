export interface FileAttachment {
  name: string;
  size: string;
  type: string;
  url: string;
}

export function isImageFile(fileName: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('image/')) return true;
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Tạo token tệp tin dạng [:file:name|size|type|url:]
 */
export function encodeAttachmentToken(file: FileAttachment): string {
  return `[:file:${file.name}|${file.size}|${file.type}|${file.url}:]`;
}

/**
 * Trích xuất tệp đính kèm và văn bản thuần túy từ nội dung tin nhắn
 */
export function extractAttachmentFromContent(rawContent?: string): { text: string; attachment: FileAttachment | null } {
  if (!rawContent) {
    return { text: '', attachment: null };
  }

  // Khớp cú pháp: [:file:name|size|type|url:]
  const regex = /\[:file:([^|]+)\|([^|]+)\|([^|]+)\|([^:]+):\]/;
  const match = rawContent.match(regex);

  if (!match) {
    return { text: rawContent, attachment: null };
  }

  const attachment: FileAttachment = {
    name: match[1],
    size: match[2],
    type: match[3],
    url: match[4]
  };

  const text = rawContent.replace(match[0], '').trim();
  return { text, attachment };
}
