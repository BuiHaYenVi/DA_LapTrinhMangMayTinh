import React, { useState, useEffect } from 'react';
import type { User } from '../types/chat';
import { chatBridge } from '../services/chatBridge';

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
          <div className="auth-logo-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <h2 className="auth-title">Chào mừng trở lại!</h2>
          <p className="auth-subtitle">Rất vui được gặp lại bạn trên Discord Mini</p>
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
