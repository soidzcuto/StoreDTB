import React from "react";
import { COLORS } from "../theme";

export default function Badge({ children, tone = "accent" }) {
  const map = {
    accent: { bg: "rgba(117,107,255,0.15)", color: COLORS.accent, border: "rgba(117,107,255,0.35)" },
    success: { bg: "rgba(53,208,127,0.12)", color: COLORS.success, border: "rgba(53,208,127,0.3)" },
    danger: { bg: "rgba(255,77,90,0.12)", color: COLORS.danger, border: "rgba(255,77,90,0.3)" },
    muted: { bg: "rgba(139,147,161,0.12)", color: COLORS.textSub, border: COLORS.border },
  };
  const t = map[tone] || map.accent;
  return (
    <span
      style={{
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        fontSize: "10.5px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "3px 8px",
        borderRadius: "999px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
