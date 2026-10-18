import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Room } from '../types/chat';
import {
  ROOM_ICON_PRESETS,
  ROOM_COLOR_PRESETS,
  getRoomAcronym,
  saveRoomCustomStyle
} from './rail/RoomRailItem';

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
  const [selectedIcon, setSelectedIcon] = useState('');
  const [selectedColor, setSelectedColor] = useState('#5865F2');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRoomName('');
      setRoomDesc('');
      setSelectedIcon('');
      setSelectedColor('#5865F2');
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
      saveRoomCustomStyle(undefined, trimmedName, {
        icon: selectedIcon || undefined,
        color: selectedColor || undefined
      });
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

  const previewAcronym = selectedIcon || getRoomAcronym(roomName || 'Phòng Mới');

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card server-modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '460px', width: '100%', position: 'relative' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="modal-close-icon-btn"
          title="Đóng (ESC)"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'center', marginBottom: '16px', padding: '0 16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: selectedColor || 'var(--accent)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: selectedIcon ? '26px' : '20px',
                fontWeight: 700,
                marginBottom: '10px',
                boxShadow: '0 6px 16px rgba(0,0,0,0.28)'
              }}
            >
              {previewAcronym}
            </div>
            <h2 
              id="create-room-title" 
              style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-header)', margin: '0 0 6px' }}
            >
              Tạo phòng chat
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
              Tạo một phòng chat mới và tùy chỉnh biểu tượng riêng cho nhóm của bạn.
            </p>
          </div>

          {/* Ô Tên phòng */}
          <div className="modal-field" style={{ marginBottom: '12px' }}>
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

          {/* Tùy chỉnh Biểu tượng (Icon) Phòng */}
          <div className="modal-field" style={{ marginBottom: '12px' }}>
            <label>BIỂU TƯỢNG PHÒNG (ICON)</label>
            <div className="custom-icon-picker-row">
              {ROOM_ICON_PRESETS.map((ic, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`custom-icon-chip ${selectedIcon === ic ? 'active' : ''}`}
                  style={!ic ? { fontSize: '13px', fontWeight: 700 } : undefined}
                  onClick={() => setSelectedIcon(ic)}
                  title={ic ? `Biểu tượng ${ic}` : 'Chữ viết tắt mặc định'}
                >
                  {ic || 'Chữ'}
                </button>
              ))}
            </div>
          </div>

          {/* Tùy chỉnh Màu sắc Phòng */}
          <div className="modal-field" style={{ marginBottom: '12px' }}>
            <label>MÀU SẮC BIỂU TƯỢNG</label>
            <div className="custom-color-picker-row">
              {ROOM_COLOR_PRESETS.filter(Boolean).map((colorHex) => (
                <button
                  key={colorHex}
                  type="button"
                  className={`custom-color-swatch ${selectedColor === colorHex ? 'active' : ''}`}
                  style={{ backgroundColor: colorHex }}
                  onClick={() => setSelectedColor(colorHex)}
                  title={`Màu ${colorHex}`}
                />
              ))}
            </div>
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
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '14px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !roomName.trim()}
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
