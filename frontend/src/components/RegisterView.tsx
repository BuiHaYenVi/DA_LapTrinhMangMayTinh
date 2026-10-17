import React, { useState } from 'react';
import { chatBridge } from '../services/chatBridge';

interface RegisterViewProps {
  onRegisterSuccess: (username: string, message: string) => void;
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRegisterSuccess,
  onSwitchToLogin
}) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = (): string | null => {
    const trimmedUser = username.trim();
    if (!trimmedUser) {
      return 'Vui lòng nhập tên đăng nhập.';
    }
    if (trimmedUser.length < 3) {
      return 'Tên đăng nhập phải có ít nhất 3 ký tự.';
    }
    if (trimmedUser.length > 32) {
      return 'Tên đăng nhập không được vượt quá 32 ký tự.';
    }
    if (trimmedUser.includes('|') || trimmedUser.includes('\n') || trimmedUser.includes('\r')) {
      return "Tên đăng nhập không được chứa ký tự đặc biệt ('|').";
    }

    if (!password) {
      return 'Vui lòng nhập mật khẩu.';
    }
    if (password.length < 3) {
      return 'Mật khẩu phải có ít nhất 3 ký tự.';
    }
    if (password.includes('|') || password.includes('\n') || password.includes('\r')) {
      return "Mật khẩu không được chứa ký tự đặc biệt ('|').";
    }

    if (password !== confirmPassword) {
      return 'Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.';
    }

    const trimmedDisplay = displayName.trim();
    if (trimmedDisplay && (trimmedDisplay.includes('|') || trimmedDisplay.includes('\n') || trimmedDisplay.includes('\r'))) {
      return "Tên hiển thị không được chứa ký tự đặc biệt ('|').";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage('');

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const trimmedUser = username.trim();
      const finalDisplay = displayName.trim() || trimmedUser;

      // Tuyệt đối không trim password
      const result = await chatBridge.register(trimmedUser, password, finalDisplay);

      if (result.success) {
        onRegisterSuccess(trimmedUser, result.message || 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      } else {
        setErrorMessage(result.message || 'Đăng ký thất bại. Tên đăng nhập có thể đã được sử dụng.');
      }
    } catch (err: any) {
      setErrorMessage('Không thể gửi yêu cầu đăng ký: ' + (err?.message || 'Lỗi mạng'));
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
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h2 className="auth-title">Tạo tài khoản mới</h2>
          <p className="auth-subtitle">Tham gia trò chuyện và kết nối cùng bạn bè</p>
        </div>

        {/* Thông báo Lỗi */}
        {errorMessage && (
          <div className="auth-alert error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form đăng ký */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-displayname">
              TÊN HIỂN THỊ (TÙY CHỌN)
            </label>
            <input
              id="reg-displayname"
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
              tabIndex={1}
              placeholder="VD: Nguyễn Văn A (Mặc định là username)"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">
              TÊN ĐĂNG NHẬP <span className="required-star">*</span>
            </label>
            <input
              id="reg-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoFocus
              tabIndex={2}
              autoComplete="username"
              placeholder="Chữ cái, số (tối thiểu 3 ký tự)"
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label className="form-label" htmlFor="reg-password">
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
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                tabIndex={3}
                autoComplete="new-password"
                placeholder="Nhập mật khẩu an toàn"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm-password">
              XÁC NHẬN MẬT KHẨU <span className="required-star">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                tabIndex={4}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu vừa nhập"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`btn-auth-submit ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
            tabIndex={5}
          >
            {isLoading ? (
              <span className="btn-loading-content">
                <span className="spinner" /> Đang tạo tài khoản...
              </span>
            ) : (
              'Tiếp tục'
            )}
          </button>

          <div className="auth-footer-link">
            <button
              type="button"
              className="link-switch-auth"
              onClick={onSwitchToLogin}
              disabled={isLoading}
              tabIndex={6}
            >
              ← Đã có tài khoản? Đăng nhập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
