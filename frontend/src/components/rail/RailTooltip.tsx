import React, { useState, useRef, useEffect } from 'react';

interface Props {
  text: string;
  children: React.ReactNode;
}

/**
 * Tooltip xuất hiện bên phải nút sau 150ms khi trỏ chuột hoặc focus bàn phím.
 * Nền --tooltip-bg, chữ --tooltip-text, bo góc 8px, mũi tên trỏ về nút.
 * Tự động ẩn ngay lập tức khi click chuột vào nút hoặc khi chuột rời đi.
 */
export const RailTooltip: React.FC<Props> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!text) return <>{children}</>;

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, 150);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  return (
    <div
      className="rail-tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onMouseDown={hideTooltip}
      onClick={hideTooltip}
    >
      {children}
      <div
        className={`rail-tooltip ${isVisible ? 'visible' : ''}`}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        {text}
      </div>
    </div>
  );
};

