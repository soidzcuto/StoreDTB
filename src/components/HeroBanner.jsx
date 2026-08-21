import React from "react";
import { Zap, ShieldCheck, Sparkles, ArrowRight, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { COLORS } from "../theme";

export default function HeroBanner() {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        background: "linear-gradient(135deg, #161A28 0%, #0F121C 50%, #0A0C14 100%)",
        border: `1px solid rgba(117, 107, 255, 0.25)`,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        marginBottom: "28px",
        padding: "36px 32px",
      }}
      className="dashboard-hero-banner"
    >
      {/* Decorative Glow Elements */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(117, 107, 255, 0.22) 0%, rgba(117, 107, 255, 0) 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-60px",
          left: "20%",
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ maxWidth: "600px" }}>
          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "20px",
                background: "rgba(117, 107, 255, 0.18)",
                border: "1px solid rgba(117, 107, 255, 0.4)",
                color: "#9D95FF",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              <Sparkles size={13} color="#9D95FF" /> HỆ THỐNG DTB STORE
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "20px",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.35)",
                color: "#22C55E",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <Zap size={13} color="#22C55E" /> Giao Key &amp; Token Tự Động 24/7
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "#FFFFFF",
              margin: "0 0 10px",
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
            }}
          >
            Kho Bản Quyền &amp; Dịch Vụ Công Nghệ Hàng Đầu
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "#94A3B8",
              margin: "0 0 22px",
              lineHeight: 1.6,
            }}
          >
            Cung cấp key tối ưu hiệu năng, cấu hình game độc quyền và token chất lượng cao. Nạp tiền SePay tự động cộng tiền trong 2 giây.
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link
              to="/nap-tien"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 22px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                color: "#FFFFFF",
                fontSize: "13.5px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
                transition: "transform 150ms ease, box-shadow 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.35)";
              }}
            >
              <Wallet size={16} /> Nạp tiền ngay
            </Link>

            <Link
              to="/tai-xuong"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 20px",
                borderRadius: "12px",
                border: "1px solid #283046",
                background: "rgba(20, 24, 36, 0.8)",
                color: "#CBD5E1",
                fontSize: "13.5px",
                fontWeight: 700,
                textDecoration: "none",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(117, 107, 255, 0.5)";
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#283046";
                e.currentTarget.style.color = "#CBD5E1";
              }}
            >
              Tải Tool miễn phí <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right Feature Highlights Card */}
        <div
          style={{
            background: "rgba(13, 16, 25, 0.8)",
            border: "1px solid #202638",
            borderRadius: "16px",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            minWidth: "240px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(34, 197, 94, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E" }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#FFFFFF" }}>Bảo hành 100%</div>
              <div style={{ fontSize: "11.5px", color: "#8B95A8" }}>Key &amp; Token chính hãng</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818CF8" }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#FFFFFF" }}>Nhận hàng tức thì</div>
              <div style={{ fontSize: "11.5px", color: "#8B95A8" }}>Hệ thống giao tự động</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 185, 66, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5B942" }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#FFFFFF" }}>Hỗ trợ 24/7</div>
              <div style={{ fontSize: "11.5px", color: "#8B95A8" }}>Giải đáp &amp; cài đặt nhanh</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-hero-banner {
            padding: 24px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
