import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { fetchProfile, createProfileIfMissing } from '../api';

const defaultAuthContext = {
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: () => {},
};

export const AuthContext = createContext(defaultAuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // Supabase Auth user
  const [profile, setProfile] = useState(null);   // bảng profiles
  const [loading, setLoading] = useState(true);   // đang check session

  // ── Khởi tạo: lấy session hiện tại ──────────────────────────
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          let p = await fetchProfile(currentUser.id).catch(() => null);
          if (!p) {
            // Fallback tạo profile nếu trigger chưa tạo
            p = await createProfileIfMissing(currentUser).catch(() => null);
          }
          setProfile(p);
        }
      } catch (err) {
        console.error('Lỗi khởi tạo session:', err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // Lắng nghe thay đổi auth (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          let p = await fetchProfile(currentUser.id).catch(() => null);
          if (!p) {
            p = await createProfileIfMissing(currentUser).catch(() => null);
          }
          setProfile(p);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Đăng nhập bằng tên tài khoản ─────────────────────────────
  async function signIn(usernameOrEmail, password) {
    // Nếu người dùng nhập username (không có @), tra cứu email từ profiles
    let loginEmail = usernameOrEmail;
    if (!usernameOrEmail.includes('@')) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', usernameOrEmail.trim())
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Tên tài khoản không tồn tại.');
      }
      loginEmail = profile.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) throw error;
    return data;
  }

  // ── Đăng ký ──────────────────────────────────────────────────
  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }, // meta data
      },
    });
    if (error) throw error;

    // Nếu signup trả về user ngay (email confirm tắt)
    if (data?.user) {
      await createProfileIfMissing(data.user, username).catch(() => {});
    }

    return data;
  }

  // ── Đăng xuất ────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut();
  }

  // ── Cập nhật profile local (sau khi update balance v.v.) ─────
  function refreshProfile(newProfileData) {
    setProfile((prev) => ({ ...prev, ...newProfileData }));
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx || defaultAuthContext;
}
