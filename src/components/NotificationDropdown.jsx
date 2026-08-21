import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../theme";
import { fetchNotifications } from "../api";

export default function NotificationDropdown({ open, onClose }) {
  const ref = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open && notifications.length === 0) {
      fetchNotifications()
        .then(setNotifications)
        .catch(console.error);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        right: 0,
        top: "calc(100% + 10px)",
        width: "320px",
        maxWidth: "88vw",
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "14px",
        boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`, fontWeight: 700, fontSize: "13.5px", color: COLORS.textMain }}>
        Thông báo
      </div>
      <div style={{ maxHeight: "320px", overflowY: "auto" }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${COLORS.border}`,
              display: "flex",
              gap: "10px",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                marginTop: "6px",
                flexShrink: 0,
                background: n.tone === "success" ? COLORS.success : COLORS.accent,
              }}
            />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.textMain }}>{n.title}</div>
              <div style={{ fontSize: "12px", color: COLORS.textSub, marginTop: "2px", lineHeight: 1.4 }}>{n.detail}</div>
              <div style={{ fontSize: "11px", color: COLORS.textSub, marginTop: "4px", opacity: 0.7 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
