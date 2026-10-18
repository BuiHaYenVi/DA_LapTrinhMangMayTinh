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
        {/* Header */}
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
            <AlertCircle size={18} className="alert-icon" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>{errorMessage}</span>
              {errorMessage.includes('chưa được đăng ký') && (
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00a8fc',
                    padding: 0,
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '13px',
                    marginTop: '2px'
                  }}
                >
                  👉 Bấm vào đây để Đăng ký tài khoản ngay
                </button>
              )}
            </div>
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
    </div>
  );
};
