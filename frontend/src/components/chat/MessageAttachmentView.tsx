import React, { useState } from 'react';
import { 
  FileText, Download, X, Eye, FileArchive, FileSpreadsheet, 
  FileCode, File, Loader2 
} from 'lucide-react';
import { type FileAttachment, isImageFile } from './attachmentUtils';

interface AttachmentViewProps {
  attachment: FileAttachment;
}

export const MessageAttachmentView: React.FC<AttachmentViewProps> = ({ attachment }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const isImg = isImageFile(attachment.name, attachment.type);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive size={28} className="attachment-type-icon archive" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet size={28} className="attachment-type-icon sheet" />;
    }
    if (['js', 'ts', 'java', 'html', 'css', 'py', 'json', 'xml'].includes(ext)) {
      return <FileCode size={28} className="attachment-type-icon code" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText size={28} className="attachment-type-icon doc" />;
    }
    return <File size={28} className="attachment-type-icon generic" />;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = attachment.url;
    a.download = attachment.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isImg) {
    return (
      <div className="discord-attachment-wrapper">
        <div className="discord-image-container" onClick={() => setIsLightboxOpen(true)}>
          <img 
            src={attachment.url} 
            alt={attachment.name} 
            className="discord-chat-image" 
            loading="lazy" 
          />
          <div className="discord-image-overlay">
            <span className="discord-image-hint">
              <Eye size={16} /> Nhấp để xem kích thước đầy đủ
            </span>
            <button 
              type="button" 
              className="discord-image-quick-dl" 
              title="Tải ảnh xuống" 
              onClick={handleDownload}
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* Modal Lightbox xem ảnh to */}
        {isLightboxOpen && (
          <div className="discord-lightbox-backdrop" onClick={() => setIsLightboxOpen(false)}>
            <div className="discord-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <div className="discord-lightbox-header">
                <span className="discord-lightbox-title" title={attachment.name}>
                  {attachment.name} ({attachment.size})
                </span>
                <div className="discord-lightbox-actions">
                  <button 
                    type="button" 
                    className="discord-lightbox-btn" 
                    onClick={handleDownload}
                    title="Tải về máy"
                  >
                    <Download size={16} />
                    <span>Tải về</span>
                  </button>
                  <button 
                    type="button" 
                    className="discord-lightbox-close" 
                    onClick={() => setIsLightboxOpen(false)}
                    title="Đóng (Esc)"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="discord-lightbox-body">
                <img src={attachment.url} alt={attachment.name} className="discord-lightbox-image" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tệp tin thông thường
  return (
    <div className="discord-attachment-wrapper">
      <div className="discord-file-card">
        <div className="discord-file-icon-wrap">
          {getFileIcon(attachment.name)}
        </div>
        <div className="discord-file-info">
          <div className="discord-file-name" title={attachment.name}>
            {attachment.name}
          </div>
          <div className="discord-file-meta">
            {attachment.size}
          </div>
        </div>
        <button 
          type="button" 
          className="discord-file-download-btn" 
          title={`Tải xuống ${attachment.name}`}
          onClick={handleDownload}
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  );
};

interface AttachmentPreviewProps {
  attachment: FileAttachment | null;
  isUploading?: boolean;
  onRemove: () => void;
}

export const AttachmentPreviewBox: React.FC<AttachmentPreviewProps> = ({
  attachment,
  isUploading,
  onRemove
}) => {
  if (isUploading) {
    return (
      <div className="discord-attachment-preview-box uploading">
        <Loader2 size={18} className="discord-spin" />
        <span className="preview-uploading-text">Đang tải lên tệp tin...</span>
      </div>
    );
  }

  if (!attachment) return null;

  const isImg = isImageFile(attachment.name, attachment.type);

  return (
    <div className="discord-attachment-preview-box">
      <div className="discord-preview-inner">
        {isImg ? (
          <div className="discord-preview-thumb-wrap">
            <img src={attachment.url} alt={attachment.name} className="discord-preview-thumb" />
          </div>
        ) : (
          <div className="discord-preview-icon-wrap">
            <FileText size={24} color="#5865f2" />
          </div>
        )}
        <div className="discord-preview-details">
          <span className="discord-preview-name" title={attachment.name}>
            {attachment.name}
          </span>
          <span className="discord-preview-size">{attachment.size}</span>
        </div>
        <button 
          type="button" 
          className="discord-preview-remove-btn" 
          onClick={onRemove}
          title="Xóa tệp đính kèm"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
