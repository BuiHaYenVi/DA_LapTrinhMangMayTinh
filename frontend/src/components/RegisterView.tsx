import React, { useState } from 'react';
import { chatBridge } from '../services/chatBridge';
import { Logo } from './Logo';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      return 'Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.';
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

      // Không bao giờ trim mật khẩu
      const result = await chatBridge.register(trimmedUser, password, finalDisplay);

      if (result.success) {
        onRegisterSuccess(trimmedUser, result.message || 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
      } else {
        setErrorMessage(result.message || 'Đăng ký thất bại. Tên đăng nhập này có thể đã được người khác sử dụng.');
      }
    } catch (err: any) {
      setErrorMessage('Không thể gửi yêu cầu đăng ký: ' + (err?.message || 'Lỗi mạng'));
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

      <div className="auth-card auth-card-register">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-row">
            <Logo size={48} withGlow={true} />
          </div>
          <h1 className="auth-title">Tạo một tài khoản</h1>
          <p className="auth-subtitle">Tham gia trò chuyện và kết nối cùng bạn bè</p>
        </div>

        {/* Thông báo Lỗi */}
        {errorMessage && (
          <div className="auth-alert error" role="alert">
            <AlertCircle size={18} className="alert-icon" />
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
              placeholder="Tên bạn bè nhìn thấy (VD: Nguyễn Văn A)"
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
            <div className="label-row">
              <label className="form-label" htmlFor="reg-confirm-password">
                XÁC NHẬN MẬT KHẨU <span className="required-star">*</span>
              </label>
              <button
                type="button"
                className="show-pass-icon-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                title={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
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

          <p className="auth-terms-hint">
            Bằng việc đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của Huddle.
          </p>

          <div className="auth-footer-link">
            <button
              type="button"
              className="link-switch-auth"
              onClick={onSwitchToLogin}
              disabled={isLoading}
              tabIndex={6}
            >
              ← Đã có tài khoản? Đăng nhập ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
