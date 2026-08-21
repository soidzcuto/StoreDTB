import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Lock, Mail, Eye, EyeOff, LogIn, UserPlus, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelSt = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 700,
  color: '#8B95A8',
  marginBottom: '8px',
  letterSpacing: '0.02em',
};

const inputWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: '#0A0C10',
  border: '1px solid #1E2330',
  borderRadius: '12px',
  padding: '13px 16px',
  transition: 'border-color 200ms ease',
};

const inputSt = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#E8EAF0',
  fontSize: '14px',
};

const iconBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#8B95A8',
  display: 'flex',
  padding: 0,
};

function submitBtn(disabled) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px 0',
    borderRadius: '12px',
    border: 'none',
    background: disabled ? '#3D3880' : 'linear-gradient(135deg, #756BFF, #4A3FE0)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: '6px',
  };
}

function Field({ label, icon: Icon, type = 'text', value, onChange, placeholder, autoComplete, showToggle, showPw, onToggle }) {
  return (
    <div>
      <label style={labelSt}>{label}</label>
      <div
        style={inputWrap}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(117,107,255,0.55)')}
        onBlur={(e)  => (e.currentTarget.style.borderColor = '#1E2330')}
      >
        <Icon size={16} style={{ color: '#8B95A8', flexShrink: 0 }} />
        <input
          type={showToggle ? (showPw ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={inputSt}
        />
        {showToggle && (
          <button type="button" onClick={onToggle} style={iconBtn} tabIndex={-1}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

function AlertBox({ type, text }) {
  const ok = type === 'ok';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(255,77,90,0.1)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(255,77,90,0.3)'}`,
      borderRadius: '10px', padding: '10px 14px',
      fontSize: '13px', color: ok ? '#22C55E' : '#FF4D5A',
      marginBottom: '16px',
      animation: 'fadeSlideDown 200ms ease both',
    }}>
      {ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {text}
    </div>
  );
}

// ── LOGIN form ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      await signIn(username.trim(), password);
      onSuccess();
    } catch (err) {
      if (err.message?.includes('không tồn tại') || err.message?.includes('not found')) {
        setError('Tên tài khoản không tồn tại.');
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Tên tài khoản hoặc mật khẩu không đúng.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Tài khoản chưa xác nhận. Vui lòng kiểm tra hộp thư.');
      } else {
        setError(err.message || 'Đăng nhập thất bại.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && <AlertBox type="err" text={error} />}

      <Field
        label="Tên tài khoản"
        icon={User}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Nhập tên tài khoản của bạn"
        autoComplete="username"
      />
      <Field
        label="Mật khẩu"
        icon={Lock}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        showToggle
        showPw={showPw}
        onToggle={() => setShowPw((v) => !v)}
      />

      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        <LogIn size={16} />
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
}

// ── REGISTER form ─────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }) {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !email || !password || !confirm) {
      setError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Tên tài khoản phải có ít nhất 3 ký tự.');
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
      const res = await signUp(email, password, username.trim());
      if (res?.session) {
        navigate('/');
        return;
      }
      setDone(true);
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

  if (done) {
    return (
      <div style={{ textAlign: 'center', animation: 'fadeSlideDown 300ms ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <CheckCircle2 size={52} style={{ color: '#22C55E' }} />
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 800, color: '#E8EAF0' }}>
          Đăng ký thành công!
        </h2>
        <p style={{ margin: '0', fontSize: '13px', color: '#8B95A8', lineHeight: 1.7 }}>
          Tài khoản của bạn đã được tạo thành công.<br />
          Bạn có thể đăng nhập ngay bây giờ.
        </p>
        <button
          onClick={onSuccess}
          style={{ ...submitBtn(false), marginTop: '20px', width: 'auto', padding: '11px 28px' }}
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && <AlertBox type="err" text={error} />}

      <Field
        label="Tên tài khoản"
        icon={User}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="username"
        autoComplete="username"
      />
      <Field
        label="Email"
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@example.com"
        autoComplete="email"
      />
      <Field
        label="Mật khẩu"
        icon={Lock}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Tối thiểu 6 ký tự"
        autoComplete="new-password"
        showToggle
        showPw={showPw}
        onToggle={() => setShowPw((v) => !v)}
      />
      <Field
        label="Xác nhận mật khẩu"
        icon={Lock}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Nhập lại mật khẩu"
        autoComplete="new-password"
        showToggle
        showPw={showCf}
        onToggle={() => setShowCf((v) => !v)}
      />

      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        <UserPlus size={16} />
        {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </button>
    </form>
  );
}

// ── Main Auth page ────────────────────────────────────────────────────────────

export function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Nếu URL là /register thì mặc định tab register
  const [tab, setTab] = useState(location.pathname === '/register' ? 'register' : 'login');
  const [animDir, setAnimDir] = useState(null); // 'left' | 'right'
  const [visible, setVisible] = useState(true);
  const switching = useRef(false);

  // Đồng bộ URL với tab
  useEffect(() => {
    navigate(tab === 'login' ? '/login' : '/register', { replace: true });
  }, [tab]);

  function switchTab(next) {
    if (next === tab || switching.current) return;
    switching.current = true;
    const dir = next === 'register' ? 'left' : 'right';
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => {
      setTab(next);
      setAnimDir(dir === 'left' ? 'right' : 'left');
      setVisible(true);
      setTimeout(() => { switching.current = false; }, 300);
    }, 200);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0C10',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '480px' }}>
        <Logo
          size={75}
          maxWidth="260px"
          maxHeight="85px"
          style={{ justifyContent: 'center' }}
          imgStyle={{ width: 'auto', maxWidth: '260px', height: 'auto', maxHeight: '85px', objectFit: 'contain' }}
          href="/"
        />
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#12151C',
        border: '1px solid #1E2330',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
      }}>
        {/* Tab switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#0C0E14',
          borderBottom: '1px solid #1E2330',
          padding: '8px',
          gap: '6px',
          position: 'relative',
        }}>
          {[
            { key: 'login', label: 'Đăng nhập' },
            { key: 'register', label: 'Đăng ký' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              style={{
                padding: '12px 0',
                borderRadius: '14px',
                border: 'none',
                background: tab === key
                  ? 'linear-gradient(135deg, rgba(117,107,255,0.22), rgba(74,63,224,0.18))'
                  : 'transparent',
                color: tab === key ? '#A59DFF' : '#6B7280',
                fontSize: '14.5px',
                fontWeight: tab === key ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 250ms cubic-bezier(0.4,0,0.2,1)',
                position: 'relative',
                letterSpacing: tab === key ? '-0.01em' : '0',
              }}
            >
              {tab === key && (
                <span style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '14px',
                  border: '1px solid rgba(117,107,255,0.4)',
                  pointerEvents: 'none',
                }} />
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Form area with slide animation */}
        <div style={{ padding: '34px 34px 38px', overflow: 'hidden' }}>
          <div
            style={{
              animation: visible
                ? `${animDir === 'right' ? 'slideInRight' : 'slideInLeft'} 280ms cubic-bezier(0.4,0,0.2,1) both`
                : `${animDir === 'left' ? 'slideOutLeft' : 'slideOutRight'} 180ms cubic-bezier(0.4,0,0.2,1) both`,
            }}
          >
            {/* Header text */}
            <div style={{ marginBottom: '22px' }}>
              <h1 style={{ margin: '0 0 5px', fontSize: '21px', fontWeight: 800, color: '#E8EAF0' }}>
                {tab === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản'}
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#8B95A8' }}>
                {tab === 'login'
                  ? 'Nhập tài khoản và mật khẩu để tiếp tục.'
                  : 'Điền thông tin bên dưới để đăng ký.'}
              </p>
            </div>

            {tab === 'login' ? (
              <LoginForm onSuccess={() => navigate('/')} />
            ) : (
              <RegisterForm onSuccess={() => switchTab('login')} />
            )}
          </div>

          {/* Switch hint */}
          <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
            {tab === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#756BFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                transition: 'color 150ms',
              }}
            >
              {tab === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>

      {/* Keyframe CSS */}
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-28px); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(28px); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Xuất Register alias cùng component để route /register cũng hoạt động
export default Login;
export { Login as Register };
