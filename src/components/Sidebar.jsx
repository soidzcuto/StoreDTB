import React from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { COLORS } from "../theme";
import { NAV_MAIN, NAV_SERVICE } from "../data";
import Badge from "./Badge";
import Logo from "./Logo";

function NavItem({ item, onCloseMobile }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onCloseMobile}
      style={({ isActive }) => ({
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 14px",
        borderRadius: "10px",
        border: "none",
        cursor: "pointer",
        textDecoration: "none",
        background: isActive
          ? "linear-gradient(90deg, rgba(117,107,255,0.28), rgba(117,107,255,0.06))"
          : "transparent",
        color: isActive ? COLORS.textMain : COLORS.textSub,
        fontSize: "14px",
        fontWeight: isActive ? 600 : 500,
        transition: "background 180ms ease, color 180ms ease",
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={2} style={{ color: isActive ? COLORS.accent : COLORS.textSub, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && <Badge tone={item.badge === "Auto" ? "accent" : "success"}>{item.badge}</Badge>}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const content = (
    <div
      style={{
        width: "236px",
        minWidth: "236px",
        height: "100%",
        background: COLORS.sidebar,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "20px 14px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 22px", gap: "8px" }}>
        <Logo
          size={55}
          maxWidth="100%"
          maxHeight="65px"
          style={{ width: "100%", justifyContent: "flex-start" }}
          imgStyle={{ width: "100%", maxWidth: "195px", height: "auto", maxHeight: "65px", objectFit: "contain" }}
          href="/"
        />
        <button
          onClick={onCloseMobile}
          style={{
            display: mobileOpen ? "flex" : "none",
            background: "none",
            border: "none",
            color: COLORS.textSub,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ marginBottom: "22px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: COLORS.textSub, padding: "0 14px 8px" }}>
          MENU
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {NAV_MAIN.map((item) => (
            <NavItem key={item.key} item={item} onCloseMobile={onCloseMobile} />
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: COLORS.textSub, padding: "0 14px 8px" }}>
          DỊCH VỤ
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {NAV_SERVICE.map((item) => (
            <NavItem key={item.key} item={item} onCloseMobile={onCloseMobile} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: "16px" }}>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "14px", background: COLORS.card }}>
          <p style={{ margin: 0, fontSize: "12.5px", color: COLORS.textSub, lineHeight: 1.5 }}>
            Cần hỗ trợ? Đội ngũ CSKH trực 8:00 – 23:00.
          </p>
          <button
            style={{
              marginTop: "10px",
              width: "100%",
              padding: "8px 0",
              borderRadius: "8px",
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              color: COLORS.textMain,
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "border-color 180ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
          >
            Liên hệ ngay
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="sidebar-desktop-wrap">{content}</div>

      {mobileOpen && (
        <div onClick={onCloseMobile} className="mobile-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0 }}>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
