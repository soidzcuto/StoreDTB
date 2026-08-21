import React from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Plus } from "lucide-react";
import { COLORS } from "../theme";
import { useBalance } from "../context/BalanceContext";

export default function BalanceCard() {
  const { formatted } = useBalance();
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        padding: "7px 8px 7px 12px",
      }}
    >
      <Wallet size={16} style={{ color: COLORS.accent }} />
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: "10px", color: COLORS.textSub, fontWeight: 600 }}>Số dư</div>
        <div style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.textMain }}>{formatted}</div>
      </div>
      <button
        onClick={() => navigate("/nap-tien")}
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "8px",
          border: "none",
          background: COLORS.accent,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "filter 150ms ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}
        onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
        aria-label="Nạp tiền"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
