import React from 'react';

interface Props {
  text: string;
  children: React.ReactNode;
}

/**
 * Tooltip xuất hiện bên phải nút sau 150ms khi trỏ chuột hoặc focus bàn phím.
 * Nền --tooltip-bg, chữ --tooltip-text, bo góc 8px, mũi tên trỏ về nút.
 */
export const RailTooltip: React.FC<Props> = ({ text, children }) => {
  if (!text) return <>{children}</>;

  return (
    <div className="rail-tooltip-wrapper">
      {children}
      <div className="rail-tooltip" role="tooltip" aria-hidden="true">
        {text}
      </div>
    </div>
  );
};
