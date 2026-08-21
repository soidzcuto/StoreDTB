import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !email || !password || !confirm) {
      setError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Tên người dùng phải có ít nhất 3 ký tự.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, username.trim());
      setSuccess(true);
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('Email này đã được sử dụng.');
      } else if (err.message?.includes('invalid')) {
        setError('Email không hợp lệ.');
      } else {
        setError(err.message || 'Đăng ký thất bại.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <CheckCircle2 size={52} style={{ color: '#22C55E' }} />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800, color: '#E8EAF0' }}>
              Đăng ký thành công!
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#8B95A8', lineHeight: 1.6 }}>
              Tài khoản của bạn đã được tạo thành công và sẵn sàng sử dụng.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '12px 28px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #756BFF, #4A3FE0)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Đến trang đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px', justifyContent: 'center' }}>
        <div style={logoBoxStyle}>G</div>
        <span style={{ fontSize: '22px', fontWeight: 800, color: '#E8EAF0', letterSpacing: '-0.01em' }}>
          GearStore
        </span>
      </div>

      <div style={cardStyle}>
        <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#E8EAF0' }}>
          Tạo tài khoản
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: '13px', color: '#8B95A8' }}>
          Điền thông tin bên dưới để đăng ký tài khoản mới.
        </p>

        {error && (
          <div style={errorBoxStyle}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Username */}
          <div>
            <label style={labelStyle}>Tên người dùng</label>
            <div style={inputWrapStyle}>
              <User size={16} style={{ color: '#8B95A8', flexShrink: 0 }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vd: TunAnhT"
                autoComplete="username"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <div style={inputWrapStyle}>
              <Mail size={16} style={{ color: '#8B95A8', flexShrink: 0 }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Mật khẩu</label>
            <div style={inputWrapStyle}>
              <Lock size={16} style={{ color: '#8B95A8', flexShrink: 0 }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} style={iconBtnStyle} tabIndex={-1}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={labelStyle}>Xác nhận mật khẩu</label>
            <div style={inputWrapStyle}>
              <Lock size={16} style={{ color: '#8B95A8', flexShrink: 0 }} />
              <input
                type={showCf ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowCf((v) => !v)} style={iconBtnStyle} tabIndex={-1}>
                {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={submitBtnStyle(loading)}>
            {loading ? (
              'Đang tạo tài khoản...'
            ) : (
              <>
                <UserPlus size={16} />
                Tạo tài khoản
              </>
            )}
          </button>
        </form>

        <p style={{ margin: '22px 0 0', textAlign: 'center', fontSize: '13px', color: '#8B95A8' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: '#756BFF', fontWeight: 700, textDecoration: 'none' }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: '100vh',
  background: '#0A0C10',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
};

const logoBoxStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '11px',
  background: 'linear-gradient(135deg, #756BFF, #4A3FE0)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: '18px',
  color: '#fff',
};

const cardStyle = {
  width: '100%',
  maxWidth: '420px',
  background: '#12151C',
  border: '1px solid #1E2330',
  borderRadius: '20px',
  padding: '32px',
};

const errorBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'rgba(255,77,90,0.1)',
  border: '1px solid rgba(255,77,90,0.3)',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '13px',
  color: '#FF4D5A',
  marginBottom: '16px',
};

const labelStyle = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: 700,
  color: '#8B95A8',
  marginBottom: '7px',
  letterSpacing: '0.02em',
};

const inputWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  background: '#0A0C10',
  border: '1px solid #1E2330',
  borderRadius: '10px',
  padding: '11px 14px',
};

const inputStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#E8EAF0',
  fontSize: '13.5px',
};

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#8B95A8',
  display: 'flex',
  padding: 0,
};

function submitBtnStyle(loading) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '13px 0',
    borderRadius: '10px',
    border: 'none',
    background: loading ? '#3D3880' : 'linear-gradient(135deg, #756BFF, #4A3FE0)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'filter 150ms ease',
    marginTop: '4px',
  };
}
