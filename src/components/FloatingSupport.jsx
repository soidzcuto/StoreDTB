import React, { useState } from "react";
import { Sparkles, MessageCircle, Users, Facebook } from "lucide-react";
import { COLORS } from "../theme";

const SOCIALS = [
  { key: "zalo-cn", label: "Zalo CN", icon: MessageCircle, color: "#0068FF" },
  { key: "zalo-gr", label: "Zalo GR", icon: Users, color: "#0068FF" },
  { key: "zalo-gr2", label: "Zalo GR2", icon: Users, color: "#0068FF" },
  { key: "fb-cn", label: "Facebook CN", icon: Facebook, color: "#1877F2" },
  { key: "fb-gr", label: "Facebook GR", icon: Facebook, color: "#1877F2" },
];

export default function FloatingSupport() {
  const [socialsOpen, setSocialsOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "10px",
      }}
    >
      {socialsOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {SOCIALS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                title={s.label}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.card,
                  color: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
                  transition: "transform 180ms ease, border-color 180ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.08)";
                  e.currentTarget.style.borderColor = s.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = COLORS.border;
                }}
              >
                <Icon size={19} />
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setSocialsOpen((v) => !v)}
        style={{
          padding: "12px 18px",
          borderRadius: "999px",
          border: "none",
          background: `linear-gradient(135deg, ${COLORS.accent}, #4A3FE0)`,
          color: "#fff",
          fontSize: "13.5px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          boxShadow: "0 8px 22px rgba(117,107,255,0.35)",
          transition: "transform 180ms ease, filter 180ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.filter = "brightness(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.filter = "brightness(1)";
        }}
      >
        <Sparkles size={16} />
        Chat Hỗ Trợ AI
      </button>
    </div>
  );
}
