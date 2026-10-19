import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  text: string;
  children: React.ReactNode;
}

/**
 * Tooltip nổi (Portal) xuất hiện bên phải biểu tượng phòng / nhóm trên thanh rail.
 * - Sử dụng createPortal để gắn trực tiếp vào document.body, hoàn toàn không bị
 *   overflow: hidden hoặc thanh cuộn của rail cắt xén.
 * - Delay 160ms khi hover hoặc focus bàn phím, ẩn ngay khi rời đi hoặc khi click.
 * - Đóng tức thì khi nhấn phím Escape.
 * - Tự động căn giữa theo chiều dọc và có mũi tên nhỏ trỏ về nút.
 * - Hỗ trợ tên dài tự động xuống dòng, không bị tràn màn hình.
 */
// Trạng thái warm delay toàn cục: khi người dùng rê chuột lướt qua lại giữa các phòng,
// tooltip tiếp theo hiển thị ngay lập tức (Discord-style) mà không cần chờ lại 160ms.
let isTooltipWarm = false;
let warmTimer: number | null = null;

export const RailTooltip: React.FC<Props> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const tooltipIdRef = useRef<string>(`rail-tooltip-${Math.random().toString(36).substring(2, 9)}`);

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    let top = rect.top + rect.height / 2;
    const left = rect.right + 12;

    // Giữ an toàn để tooltip không bị tràn ra ngoài mép trên hoặc mép dưới màn hình
    const minTop = 28;
    const maxTop = window.innerHeight - 28;
    if (top < minTop) top = minTop;
    if (top > maxTop) top = maxTop;

    setCoords({ top, left });
  }, []);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warmTimer) {
      clearTimeout(warmTimer);
      warmTimer = null;
    }

    updatePosition();
    // Nếu tooltip đang ở chế độ "warm" (vừa hover biểu tượng trước đó), hiển thị nhanh chóng không nhấp nháy
    const delay = isTooltipWarm ? 30 : 160;

    timeoutRef.current = window.setTimeout(() => {
      updatePosition();
      setIsVisible(true);
      isTooltipWarm = true;
    }, delay);
  }, [updatePosition]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);

    // Duy trì warm state trong 220ms để hover icon kế tiếp mượt mà
    if (warmTimer) clearTimeout(warmTimer);
    warmTimer = window.setTimeout(() => {
      isTooltipWarm = false;
    }, 220);
  }, []);

  // Hỗ trợ phím Escape đóng tooltip
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, hideTooltip]);

  // Khi cuộn danh sách phòng hoặc thay đổi kích thước cửa sổ -> ẩn tooltip để tránh lệch vị trí
  useEffect(() => {
    if (!isVisible) return;
    const handleScrollOrResize = (e: Event) => {
      // Chỉ ẩn khi thực sự cuộn container danh sách phòng hoặc thay đổi kích thước cửa sổ
      if (
        e.type === 'resize' ||
        (e.target as HTMLElement)?.classList?.contains('rail-rooms-scroll') ||
        (e.target as HTMLElement)?.closest?.('.rail-rooms-scroll')
      ) {
        hideTooltip();
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, hideTooltip]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!text) return <>{children}</>;

  return (
    <div
      ref={wrapperRef}
      className="rail-tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onMouseDown={hideTooltip}
      onClick={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {typeof document !== 'undefined' && isVisible && coords && createPortal(
        <div
          id={tooltipIdRef.current}
          className="rail-portal-tooltip"
          role="tooltip"
          aria-hidden="false"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`
          }}
        >
          <span className="rail-portal-tooltip-arrow" aria-hidden="true" />
          <span className="rail-portal-tooltip-text">{text}</span>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RailTooltip;
