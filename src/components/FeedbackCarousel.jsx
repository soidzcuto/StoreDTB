import React, { useEffect, useState } from "react";
import { Star, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import { COLORS } from "../theme";
import { fetchFeedbacks } from "../api";
import Badge from "./Badge";

function navBtnStyle(disabled) {
  return {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: disabled ? "#4A5060" : COLORS.textMain,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "border-color 150ms ease, color 150ms ease",
  };
}

export default function FeedbackCarousel() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [index, setIndex] = useState(0);
  const visible = 3;
  const maxIndex = Math.max(0, feedbacks.length - visible);

  useEffect(() => {
    fetchFeedbacks()
      .then(setFeedbacks)
      .catch(console.error);
  }, []);

  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "28px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: COLORS.textMain, display: "flex", alignItems: "center", gap: "6px" }}>
            <Star size={16} style={{ color: "#F5B942" }} fill="#F5B942" />
            Feedback từ khách hàng
          </span>
          <Badge tone="success">
            <BadgeCheck size={11} /> ĐÃ XÁC MINH
          </Badge>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={prev} disabled={index === 0} style={navBtnStyle(index === 0)}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={next} disabled={index >= maxIndex} style={navBtnStyle(index >= maxIndex)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            gap: "14px",
            transform: `translateX(calc(-${index} * (100% / ${visible} + 14px / ${visible})))`,
            transition: "transform 220ms ease",
          }}
        >
          {feedbacks.map((f) => (
            <div
              key={f.id}
              className="feedback-card"
              style={{
                flex: `0 0 calc((100% - ${(visible - 1) * 14}px) / ${visible})`,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "12px",
                padding: "14px",
                background: "#0F1116",
                transition: "transform 180ms ease, border-color 180ms ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = COLORS.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = COLORS.border;
              }}
            >
              <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} style={{ color: i < f.stars ? "#F5B942" : COLORS.border }} fill={i < f.stars ? "#F5B942" : "none"} />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: COLORS.textSub, lineHeight: 1.55 }}>{f.text}</p>
              <div style={{ marginTop: "10px", fontSize: "12.5px", fontWeight: 700, color: COLORS.textMain }}>{f.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
