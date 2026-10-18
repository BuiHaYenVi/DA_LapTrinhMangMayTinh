import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Room } from '../types/chat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (name: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  existingRooms?: Room[];
}

export const CreateRoomModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreateRoom,
  existingRooms = []
}) => {
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRoomName('');
      setRoomDesc('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setRoomName('');
    setRoomDesc('');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = roomName.trim();
    const trimmedDesc = roomDesc.trim();

    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên phòng chat.');
      return;
    }

    if (trimmedName.length > 50) {
      setErrorMsg('Tên phòng không được vượt quá 50 ký tự.');
      return;
    }

    if (trimmedDesc.length > 120) {
      setErrorMsg('Mô tả phòng không được vượt quá 120 ký tự.');
      return;
    }

    const isDuplicate = existingRooms.some(
      r => r.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg('Tên phòng này đã tồn tại. Vui lòng chọn tên khác.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await onCreateRoom(trimmedName, trimmedDesc);
      if (result.success) {
        handleClose();
      } else {
        setErrorMsg(result.error || 'Không thể tạo phòng chat. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi kết nối mạng khi tạo phòng chat.');
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
        aria-labelledby="create-room-title"
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
          <div style={{ textAlign: 'center', marginBottom: '18px', padding: '0 16px' }}>
            <h2 
              id="create-room-title" 
              style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-header)', margin: '0 0 6px' }}
            >
              Tạo phòng chat
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
              Tạo một phòng chat mới để kết nối và trò chuyện cùng bạn bè.
            </p>
          </div>

          {/* Ô Tên phòng */}
          <div className="modal-field" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="create-room-name">
                TÊN PHÒNG CHAT <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {roomName.length}/50
              </span>
            </div>
            <input
              id="create-room-name"
              type="text"
              value={roomName}
              onChange={e => {
                setRoomName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Ví dụ: Chung, Học tập, Thảo luận..."
              autoFocus
              maxLength={50}
              disabled={isSubmitting}
            />
          </div>

          {/* Ô Mô tả phòng tùy chọn */}
          <div className="modal-field" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="create-room-desc">
                MÔ TẢ PHÒNG (TÙY CHỌN)
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {roomDesc.length}/120
              </span>
            </div>
            <textarea
              id="create-room-desc"
              value={roomDesc}
              onChange={e => {
                setRoomDesc(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Nhập mô tả ngắn về chủ đề phòng chat..."
              rows={2}
              maxLength={120}
              disabled={isSubmitting}
              style={{ resize: 'none' }}
            />
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
              disabled={isSubmitting || !roomName.trim()}
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 22px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: isSubmitting || !roomName.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !roomName.trim() ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CreateServerModal = CreateRoomModal;
export default CreateRoomModal;
