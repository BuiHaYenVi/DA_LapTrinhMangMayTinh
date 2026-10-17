import React, { useState, useEffect } from 'react';
import type { User } from '../types/chat';
import { chatBridge } from '../services/chatBridge';
import { Logo } from './Logo';

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
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

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

  // Kiểm tra tình trạng server khi mở form
  useEffect(() => {
    chatBridge.getStatus().then(status => {
      setServerOnline(status.serverOnline);
    }).catch(() => {
      setServerOnline(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage('');
    setSuccessMessage('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      // Tuyệt đối không trim password
      const result = await chatBridge.login(trimmedUsername, password);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      setErrorMessage('Không thể gửi yêu cầu: ' + (err?.message || 'Lỗi mạng'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
            <Logo size={54} />
          </div>
          <h2 className="auth-title">Chào mừng trở lại!</h2>
          <p className="auth-subtitle">Rất vui được gặp lại bạn trên LTMang Chat</p>
        </div>

        {/* Trạng thái máy chủ ChatServer */}
        <div className="server-status-pill">
          <span className={`status-dot ${serverOnline === true ? 'online' : serverOnline === false ? 'offline' : 'checking'}`} />
          <span className="status-text">
            {serverOnline === true ? 'ChatServer TCP: Trực tuyến (Sẵn sàng)' :
             serverOnline === false ? 'ChatServer TCP: Chưa kết nối (Hãy chạy ChatServer)' :
             'Đang kiểm tra kết nối ChatServer...'}
          </span>
        </div>

        {/* Thông báo Thành công hoặc Lỗi */}
        {successMessage && (
          <div className="auth-alert success" role="alert">
            <span className="alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="auth-alert error" role="alert">
            <span className="alert-icon">⚠️</span>
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
              placeholder="Nhập tên đăng nhập của bạn"
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label className="form-label" htmlFor="login-password">
                MẬT KHẨU <span className="required-star">*</span>
              </label>
              <button
                type="button"
                className="show-pass-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
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
                placeholder="Nhập mật khẩu"
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
