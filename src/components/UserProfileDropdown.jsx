import React, { useEffect, useRef } from "react";
import { User, ShoppingCart, History, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../theme";
import { useAuth } from "../context/AuthContext";

const ITEMS = [
  { icon: User, label: "Hồ sơ", path: "/ho-so" },
  { icon: ShoppingCart, label: "Đơn hàng của tôi", path: "/don-hang" },
  { icon: History, label: "Lịch sử giao dịch", path: "/lich-su-giao-dich" },
];

export default function UserProfileDropdown({ open, onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.username || user?.email?.split("@")[0] || "User";
  const email = profile?.email || user?.email || "";

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
      navigate("/login");
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    }
  };

  const handleNavigate = (path) => {
    onClose();
    if (path && path !== "#") {
      navigate(path);
    }
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        right: 0,
        top: "calc(100% + 10px)",
        width: "220px",
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "14px",
        boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.textMain, wordBreak: "break-all" }}>
          {displayName}
        </div>
        <div style={{ fontSize: "11.5px", color: COLORS.textSub, marginTop: "2px", wordBreak: "break-all" }}>
          {email}
        </div>
      </div>
      <div style={{ padding: "6px" }}>
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              onClick={() => handleNavigate(it.path)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 10px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: COLORS.textSub,
                fontSize: "13px",
                cursor: "pointer",
                transition: "background 150ms ease, color 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = COLORS.textMain;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = COLORS.textSub;
              }}
            >
              <Icon size={15} />
              {it.label}
            </button>
          );
        })}
        <div style={{ height: "1px", background: COLORS.border, margin: "6px 4px" }} />
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 10px",
            background: "transparent",
            border: "none",
            borderRadius: "8px",
            color: COLORS.danger,
            fontSize: "13px",
            cursor: "pointer",
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,77,90,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
