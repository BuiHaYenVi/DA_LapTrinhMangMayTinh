import React, { useState, useEffect } from 'react';
import type { User } from '../types/chat';
import { chatBridge } from '../services/chatBridge';
import { Logo } from './Logo';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToRegister: () => void;
  prefilledUsername?: string;
  prefilledSuccessMsg?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onSwitchToRegister,
  prefilledUsername = '',
  prefilledSuccessMsg = ''
}) => {
  const [username, setUsername] = useState(prefilledUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(prefilledSuccessMsg);

  useEffect(() => {
    if (prefilledUsername) {
      setUsername(prefilledUsername);
    }
  }, [prefilledUsername]);

  useEffect(() => {
    if (prefilledSuccessMsg) {
      setSuccessMessage(prefilledSuccessMsg);
    }
  }, [prefilledSuccessMsg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage('');
    setSuccessMessage('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập của bạn.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await chatBridge.login(trimmedUsername, password);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMessage('Không thể gửi yêu cầu: ' + (err?.message || 'Lỗi mạng'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Các hình khối trang trí nền tạo hiệu ứng Discord Art */}
      <div className="auth-bg-decorations" aria-hidden="true">
        <div className="decor-shape shape-1" />
        <div className="decor-shape shape-2" />
        <div className="decor-shape shape-3" />
      </div>

      <div className="auth-card auth-card-login">
        {/* CỘT TRÁI: Form đăng nhập chuẩn Discord */}
        <div className="auth-main-pane">
          <div className="auth-header">
            <div className="auth-logo-row">
              <Logo size={48} withGlow={true} />
            </div>
            <h1 className="auth-title">Chào mừng trở lại!</h1>
            <p className="auth-subtitle">Rất mừng được gặp lại bạn trên Huddle!</p>
          </div>

          {/* Thông báo Thành công hoặc Lỗi */}
          {successMessage && (
            <div className="auth-alert success" role="alert">
              <CheckCircle2 size={18} className="alert-icon" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="auth-alert error" role="alert">
              <AlertCircle size={18} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form đăng nhập */}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">
                TÊN ĐĂNG NHẬP <span className="required-star">*</span>
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoFocus
                tabIndex={1}
                autoComplete="username"
                placeholder="Nhập tên tài khoản"
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="login-password">
                  MẬT KHẨU <span className="required-star">*</span>
                </label>
                <button
                  type="button"
                  className="show-pass-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  tabIndex={2}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`btn-auth-submit ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
              tabIndex={3}
            >
              {isLoading ? (
                <span className="btn-loading-content">
                  <span className="spinner" /> Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>

            <div className="auth-footer-link">
              <span>Cần một tài khoản? </span>
              <button
                type="button"
                className="link-switch-auth"
                onClick={onSwitchToRegister}
                disabled={isLoading}
                tabIndex={4}
              >
                Đăng ký ngay
              </button>
            </div>
          </form>
        </div>

        {/* CỘT PHẢI: Bảng Đăng nhập bằng mã QR chuẩn Discord (Hiển thị trên màn hình rộng) */}
        <div className="auth-qr-pane" aria-hidden="true">
          <div className="qr-box-wrap">
            <div className="qr-code-frame">
              {/* Mockup QR Code SVG chuẩn đẹp */}
              <svg viewBox="0 0 160 160" width="150" height="150" className="qr-svg-mockup">
                <rect width="160" height="160" fill="#ffffff" rx="6" />
                {/* 3 góc định vị QR */}
                <rect x="12" y="12" width="40" height="40" fill="#1e1f22" rx="4" />
                <rect x="18" y="18" width="28" height="28" fill="#ffffff" rx="2" />
                <rect x="24" y="24" width="16" height="16" fill="var(--accent)" rx="2" />

                <rect x="108" y="12" width="40" height="40" fill="#1e1f22" rx="4" />
                <rect x="114" y="18" width="28" height="28" fill="#ffffff" rx="2" />
                <rect x="120" y="24" width="16" height="16" fill="var(--accent)" rx="2" />

                <rect x="12" y="108" width="40" height="40" fill="#1e1f22" rx="4" />
                <rect x="18" y="114" width="28" height="28" fill="#ffffff" rx="2" />
                <rect x="24" y="120" width="16" height="16" fill="var(--accent)" rx="2" />

                {/* Các ma trận điểm QR code ngẫu nhiên sắc nét */}
                <rect x="62" y="16" width="8" height="8" fill="#1e1f22" />
                <rect x="80" y="16" width="8" height="8" fill="#1e1f22" />
                <rect x="62" y="34" width="8" height="8" fill="#1e1f22" />
                <rect x="74" y="26" width="8" height="8" fill="#1e1f22" />
                <rect x="90" y="34" width="8" height="8" fill="#1e1f22" />

                <rect x="16" y="62" width="8" height="8" fill="#1e1f22" />
                <rect x="34" y="62" width="8" height="8" fill="#1e1f22" />
                <rect x="26" y="74" width="8" height="8" fill="#1e1f22" />
                <rect x="42" y="80" width="8" height="8" fill="#1e1f22" />

                <rect x="62" y="62" width="36" height="36" fill="var(--accent)" rx="8" />
                <circle cx="80" cy="80" r="10" fill="#ffffff" />
                <circle cx="77" cy="80" r="2.5" fill="var(--accent)" />
                <circle cx="83" cy="80" r="2.5" fill="var(--accent)" />

                <rect x="108" y="62" width="8" height="8" fill="#1e1f22" />
                <rect x="124" y="70" width="8" height="8" fill="#1e1f22" />
                <rect x="140" y="62" width="8" height="8" fill="#1e1f22" />
                <rect x="116" y="86" width="8" height="8" fill="#1e1f22" />
                <rect x="136" y="86" width="8" height="8" fill="#1e1f22" />

                <rect x="62" y="108" width="8" height="8" fill="#1e1f22" />
                <rect x="80" y="116" width="8" height="8" fill="#1e1f22" />
                <rect x="68" y="132" width="8" height="8" fill="#1e1f22" />
                <rect x="90" y="126" width="8" height="8" fill="#1e1f22" />
                <rect x="84" y="140" width="8" height="8" fill="#1e1f22" />

                <rect x="108" y="108" width="8" height="8" fill="#1e1f22" />
                <rect x="124" y="116" width="8" height="8" fill="#1e1f22" />
                <rect x="116" y="132" width="8" height="8" fill="#1e1f22" />
                <rect x="138" y="124" width="8" height="8" fill="#1e1f22" />
                <rect x="130" y="140" width="8" height="8" fill="#1e1f22" />
              </svg>
            </div>
            <h2 className="qr-title">Đăng nhập bằng mã QR</h2>
            <p className="qr-desc">
              Quét mã này bằng <strong>ứng dụng di động</strong> để đăng nhập tức thì.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
