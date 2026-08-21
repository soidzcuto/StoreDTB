import React, { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { COLORS } from "../theme";
import { NOTIFICATIONS } from "../data";
import NotificationDropdown from "./NotificationDropdown";
import UserProfileDropdown from "./UserProfileDropdown";
import BalanceCard from "./BalanceCard";
import { useAuth } from "../context/AuthContext";

function LangBadge() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "38px",
        padding: "0 10px",
        borderRadius: "10px",
        border: `1px solid ${COLORS.border}`,
        background: COLORS.card,
        color: COLORS.textSub,
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.03em",
        flexShrink: 0,
      }}
    >
      VN
    </div>
  );
}

export default function Header({ onOpenMobile, search, setSearch }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { profile, user } = useAuth();

  const displayName = profile?.username || user?.email?.split('@')[0] || "User";
  const initial = displayName.substring(0, 2).toUpperCase();

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        height: "68px",
        background: COLORS.header,
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
        <button
          onClick={onOpenMobile}
          className="mobile-menu-btn"
          style={{
            display: "none",
            background: "none",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "9px",
            padding: "8px",
            color: COLORS.textMain,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Menu size={18} />
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "10px",
            padding: "9px 12px",
            maxWidth: "380px",
            width: "100%",
          }}
        >
          <Search size={16} style={{ color: COLORS.textSub, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="Tìm kiếm sản phẩm..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: COLORS.textMain,
              fontSize: "13.5px",
              width: "100%",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <div className="lang-badge-wrap">
          <LangBadge />
        </div>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            style={{
              position: "relative",
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              border: `1px solid ${COLORS.border}`,
              background: COLORS.card,
              color: COLORS.textMain,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
            aria-label="Thông báo"
          >
            <Bell size={17} />
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: COLORS.danger,
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                minWidth: "17px",
                height: "17px",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${COLORS.header}`,
              }}
            >
              {NOTIFICATIONS.length}
            </span>
          </button>
          <NotificationDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <div className="balance-card-wrap">
          <BalanceCard />
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "12px",
              padding: "5px 10px 5px 5px",
              cursor: "pointer",
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${COLORS.accent}, #4A3FE0)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: "12.5px",
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <span className="username-label" style={{ fontSize: "13px", fontWeight: 600, color: COLORS.textMain }}>
              {displayName}
            </span>
          </button>
          <UserProfileDropdown open={profileOpen} onClose={() => setProfileOpen(false)} />
        </div>
      </div>
    </div>
  );
}
