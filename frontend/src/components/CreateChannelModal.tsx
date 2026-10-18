import React, { useState, useEffect } from 'react';
import { X, Hash } from 'lucide-react';
import type { Room, Channel } from '../types/chat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  existingChannels?: Channel[];
  onCreateChannel: (roomId: number, channelName: string) => Promise<{ success: boolean; error?: string }>;
}

export const CreateChannelModal: React.FC<Props> = ({
  isOpen,
  onClose,
  room,
  existingChannels = [],
  onCreateChannel
}) => {
  const [channelName, setChannelName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setChannelName('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !room) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setChannelName('');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Chuẩn hóa tên kênh: trim khoảng trắng thừa
    const trimmed = channelName.trim();

    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên kênh chat.');
      return;
    }

    if (trimmed.length > 50) {
      setErrorMsg('Tên kênh không được vượt quá 50 ký tự.');
      return;
    }

    // Kiểm tra tên kênh trùng trong cùng một phòng (case-insensitive)
    const isDuplicate = existingChannels.some(
      ch => ch.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`Kênh "#${trimmed}" đã tồn tại trong phòng này. Vui lòng chọn tên khác.`);
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await onCreateChannel(room.id, trimmed);
      if (result.success) {
        handleClose();
      } else {
        setErrorMsg(result.error || 'Không thể tạo kênh chat. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi kết nối khi gửi yêu cầu tạo kênh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card server-modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '100%', position: 'relative' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-channel-title"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Đóng"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'left', marginBottom: '16px', padding: '0 4px' }}>
            <h2 
              id="create-channel-title" 
              style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-header)', margin: '0 0 6px' }}
            >
              Tạo kênh chat
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
              trong phòng <strong style={{ color: 'var(--text-normal)' }}>{room.name}</strong>
            </p>
          </div>

          {/* Loại kênh: Kênh chat chữ */}
          <div className="modal-field" style={{ marginBottom: '16px' }}>
            <label style={{ marginBottom: '6px', display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
              LOẠI KÊNH
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '6px',
              border: '1px solid var(--accent)'
            }}>
              <Hash size={24} color="var(--accent)" />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-header)', fontSize: '14px' }}>Chat chữ</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đăng tin nhắn văn bản, hình ảnh, tài liệu</div>
              </div>
            </div>
          </div>

          {/* Tên kênh chat */}
          <div className="modal-field" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="create-channel-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                TÊN KÊNH <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {channelName.length}/50
              </span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '16px',
                pointerEvents: 'none'
              }}>
                #
              </span>
              <input
                id="create-channel-name"
                type="text"
                value={channelName}
                onChange={e => {
                  setChannelName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="kenh-moi"
                autoFocus
                maxLength={50}
                disabled={isSubmitting}
                style={{
                  paddingLeft: '30px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Thông báo lỗi inline thực tế */}
          {errorMsg && (
            <div className="room-modal-inline-error" role="alert" style={{ marginBottom: '14px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Footer nút hành động */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                padding: '8px 14px'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !channelName.trim()}
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 22px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: isSubmitting || !channelName.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !channelName.trim() ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo kênh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
