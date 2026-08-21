import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { updateBalance } from '../api';

const defaultBalanceContext = {
  balance: 0,
  setBalance: () => {},
  addBalance: () => {},
  formatted: '0đ',
};

const BalanceContext = createContext(defaultBalanceContext);

export function formatVND(amount) {
  return (amount || 0).toLocaleString('vi-VN') + 'đ';
}

export function BalanceProvider({ children }) {
  const auth = useAuth();
  const profile = auth?.profile;
  const user = auth?.user;
  const refreshProfile = auth?.refreshProfile;

  const [balance, setBalanceLocal] = useState(0);

  // Đồng bộ balance từ profile khi đăng nhập / profile thay đổi
  useEffect(() => {
    if (profile?.balance != null) {
      setBalanceLocal(profile.balance);
    } else if (!user) {
      setBalanceLocal(0);
    }
  }, [profile, user]);

  // Cập nhật balance cả local lẫn DB
  async function setBalance(newBalance) {
    setBalanceLocal(newBalance);
    if (user) {
      try {
        const updated = await updateBalance(user.id, newBalance);
        if (refreshProfile) {
          refreshProfile({ balance: updated?.balance ?? newBalance });
        }
      } catch (err) {
        console.error('Không thể cập nhật balance:', err);
      }
    }
  }

  const addBalance = (amount) => setBalance(balance + amount);

  return (
    <BalanceContext.Provider
      value={{ balance, setBalance, addBalance, formatted: formatVND(balance) }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const ctx = useContext(BalanceContext);
  return ctx || defaultBalanceContext;
}
