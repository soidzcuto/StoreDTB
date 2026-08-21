import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Lock, Eye, EyeOff, Save, AlertCircle,
  CheckCircle2, Camera, Shield, KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';
import { updateUserProfile } from '../api';
import { supabase } from '../supabase';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // ── Tab state ───────────────────────────────────────────────
  const [tab, setTab] = useState('info'); // 'info' | 'password'

  // ── Profile info ────────────────────────────────────────────
  const [username, setUsername]   = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving]       = useState(false);
  const [infoMsg, setInfoMsg]     = useState(null); // { type: 'ok'|'err', text }

  // ── Password change ─────────────────────────────────────────
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showCur, setShowCur]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showCon, setShowCon]       = useState(false);
  const [savingPw, setSavingPw]     = useState(false);
  const [pwMsg, setPwMsg]           = useState(null);

  // Fill form khi profile load xong
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || profile.username || '');
    }
  }, [profile]);

  // ── Lưu thông tin hồ sơ ─────────────────────────────────────
  async function handleSaveInfo(e) {
    e.preventDefault();
    setInfoMsg(null);
    if (!username.trim() || username.trim().length < 3) {
      setInfoMsg({ type: 'err', text: 'Tên tài khoản phải có ít nhất 3 ký tự.' });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, {
        username: username.trim(),
        display_name: displayName.trim() || username.trim(),
      });
      refreshProfile(updated);
      setInfoMsg({ type: 'ok', text: 'Cập nhật hồ sơ thành công!' });
    } catch (err) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        setInfoMsg({ type: 'err', text: 'Tên tài khoản này đã được sử dụng, hãy chọn tên khác.' });
      } else {
        setInfoMsg({ type: 'err', text: err.message || 'Cập nhật thất bại.' });
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Đổi mật khẩu ────────────────────────────────────────────
  async function handleChangePw(e) {
    e.preventDefault();
    setPwMsg(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: 'err', text: 'Vui lòng điền đầy đủ tất cả các trường.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: 'err', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'err', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    setSavingPw(true);
    try {
      // Xác thực mật khẩu hiện tại bằng cách re-signIn
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (verifyErr) {
        setPwMsg({ type: 'err', text: 'Mật khẩu hiện tại không đúng.' });
        setSavingPw(false);
        return;
      }
      // Cập nhật mật khẩu mới
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;
      setPwMsg({ type: 'ok', text: 'Đổi mật khẩu thành công!' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMsg({ type: 'err', text: err.message || 'Đổi mật khẩu thất bại.' });
    } finally {
      setSavingPw(false);
    }
  }

  const avatarLetter = (profile?.username || user?.email || 'U')[0].toUpperCase();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: COLORS.textMain }}>
          Hồ sơ của tôi
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: COLORS.textSub }}>
          Quản lý thông tin tài khoản và bảo mật
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', alignItems: 'start' }} className="profile-grid">
        {/* Sidebar: Avatar + Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Avatar */}
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: '24px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #756BFF, #4A3FE0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: '#fff',
              margin: '0 auto 12px',
            }}>
              {avatarLetter}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: COLORS.textMain }}>
              {profile?.display_name || profile?.username || 'Người dùng'}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.textSub, marginTop: '4px' }}>
              {user?.email}
            </div>
            <div style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#22C55E',
            }}>
              ● Đang hoạt động
            </div>
          </div>

          {/* Tab menu */}
          <div style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            {[
              { key: 'info', icon: User, label: 'Thông tin hồ sơ' },
              { key: 'password', icon: KeyRound, label: 'Đổi mật khẩu' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '13px 16px',
                  background: tab === key ? 'rgba(117,107,255,0.12)' : 'transparent',
                  borderLeft: tab === key ? '3px solid #756BFF' : '3px solid transparent',
                  border: 'none',
                  color: tab === key ? '#9D95FF' : COLORS.textSub,
                  fontSize: '13px',
                  fontWeight: tab === key ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '16px',
          padding: '24px',
        }}>
          {tab === 'info' && (
            <form onSubmit={handleSaveInfo}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: COLORS.textMain, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: '#756BFF' }} />
                Thông tin hồ sơ
              </div>
              <p style={{ fontSize: '12.5px', color: COLORS.textSub, margin: '0 0 24px' }}>
                Cập nhật tên hiển thị và tên tài khoản đăng nhập.
              </p>

              {infoMsg && (
                <div style={msgBox(infoMsg.type)}>
                  {infoMsg.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  {infoMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Username */}
                <div>
                  <label style={labelStyle}>
                    Tên tài khoản <span style={{ color: '#FF4D5A' }}>*</span>
                  </label>
                  <div style={inputWrap}>
                    <User size={15} style={{ color: COLORS.textSub }} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="tên_tài_khoản"
                      style={inputSt}
                    />
                  </div>
                  <div style={{ fontSize: '11.5px', color: COLORS.textSub, marginTop: '4px' }}>
                    Dùng để đăng nhập. Chỉ gồm chữ cái, số, dấu gạch dưới.
                  </div>
                </div>

                {/* Display name */}
                <div>
                  <label style={labelStyle}>Tên hiển thị</label>
                  <div style={inputWrap}>
                    <User size={15} style={{ color: COLORS.textSub }} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Tên hiển thị (tuỳ chọn)"
                      style={inputSt}
                    />
                  </div>
                </div>

                {/* Email (readonly) */}
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={{ ...inputWrap, opacity: 0.6 }}>
                    <Mail size={15} style={{ color: COLORS.textSub }} />
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      style={{ ...inputSt, cursor: 'not-allowed' }}
                    />
                  </div>
                  <div style={{ fontSize: '11.5px', color: COLORS.textSub, marginTop: '4px' }}>
                    Email không thể thay đổi.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={saveBtnStyle(saving)}
                >
                  <Save size={14} />
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePw}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: COLORS.textMain, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} style={{ color: '#756BFF' }} />
                Đổi mật khẩu
              </div>
              <p style={{ fontSize: '12.5px', color: COLORS.textSub, margin: '0 0 24px' }}>
                Để bảo mật tài khoản, hãy sử dụng mật khẩu mạnh và không chia sẻ với người khác.
              </p>

              {pwMsg && (
                <div style={msgBox(pwMsg.type)}>
                  {pwMsg.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  {pwMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Mật khẩu hiện tại</label>
                  <div style={inputWrap}>
                    <Lock size={15} style={{ color: COLORS.textSub }} />
                    <input
                      type={showCur ? 'text' : 'password'}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••"
                      style={inputSt}
                    />
                    <button type="button" onClick={() => setShowCur(v => !v)} style={eyeBtn}>
                      {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Mật khẩu mới</label>
                  <div style={inputWrap}>
                    <Lock size={15} style={{ color: COLORS.textSub }} />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      style={inputSt}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} style={eyeBtn}>
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Xác nhận mật khẩu mới</label>
                  <div style={inputWrap}>
                    <Lock size={15} style={{ color: COLORS.textSub }} />
                    <input
                      type={showCon ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      style={inputSt}
                    />
                    <button type="button" onClick={() => setShowCon(v => !v)} style={eyeBtn}>
                      {showCon ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={savingPw}
                  style={saveBtnStyle(savingPw)}
                >
                  <KeyRound size={14} />
                  {savingPw ? 'Đang đổi...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────

const labelStyle = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: 700,
  color: '#8B95A8',
  marginBottom: '7px',
  letterSpacing: '0.02em',
};

const inputWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  background: '#0A0C10',
  border: '1px solid #1E2330',
  borderRadius: '10px',
  padding: '11px 14px',
};

const inputSt = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#E8EAF0',
  fontSize: '13.5px',
};

const eyeBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#8B95A8',
  display: 'flex',
  padding: 0,
};

function msgBox(type) {
  const isOk = type === 'ok';
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: isOk ? 'rgba(34,197,94,0.1)' : 'rgba(255,77,90,0.1)',
    border: `1px solid ${isOk ? 'rgba(34,197,94,0.3)' : 'rgba(255,77,90,0.3)'}`,
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: isOk ? '#22C55E' : '#FF4D5A',
    marginBottom: '16px',
  };
}

function saveBtnStyle(disabled) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '11px 22px',
    borderRadius: '10px',
    border: 'none',
    background: disabled ? '#3D3880' : 'linear-gradient(135deg, #756BFF, #4A3FE0)',
    color: '#fff',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'filter 150ms ease',
  };
}
