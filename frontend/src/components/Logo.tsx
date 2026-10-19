import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '', withGlow = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <filter id="nexus-glow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="var(--accent)" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Khối nền bo góc mềm mại theo màu nhấn --accent */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        fill="var(--accent)"
        filter={withGlow ? 'url(#nexus-glow)' : undefined}
      />

      {/* Bong bóng hội thoại trung tâm cách điệu với màu tương phản --on-accent */}
      <path
        d="M14 16.5C14 13.46 16.46 11 19.5 11H28.5C31.54 11 34 13.46 34 16.5V23.5C34 26.54 31.54 29 28.5 29H22.5L16.2 33.8C15.54 34.3 14 33.84 14 32.8V29C14 29 14 28 14 16.5Z"
        fill="var(--on-accent)"
      />

      {/* Hai nút mạng TCP kết nối (Network Nodes) */}
      <circle cx="20" cy="20" r="2.3" fill="var(--accent)" />
      <circle cx="28" cy="20" r="2.3" fill="var(--accent)" />

      {/* Đường truyền kết nối dữ liệu mạng */}
      <path d="M22.3 20H25.7" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 1.5" />

      {/* Sóng phát tín hiệu mạng Socket thời gian thực */}
      <path
        d="M23 15C24.5 15 25.8 15.6 26.8 16.6"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Logo;
