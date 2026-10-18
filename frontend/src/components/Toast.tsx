import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!message || !onClose) return;
    const timer = window.setTimeout(() => {
      onClose();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <>
      {/* Vùng aria-live ẩn cho công nghệ trợ năng và trình đọc màn hình */}
      <span className="visually-hidden" role="status" aria-live="polite">
        {message}
      </span>

      {/* Khung Toast nổi đặt giữa phía dưới (cách đáy 24px) */}
      <div className="app-toast-notification" role="status">
        {message}
      </div>
    </>
  );
};

export default Toast;
