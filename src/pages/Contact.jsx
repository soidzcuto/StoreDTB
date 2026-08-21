import React, { useEffect, useState } from "react";
import { Phone, MessageCircle, Facebook, ExternalLink, Zap, HeadphonesIcon, Layers } from "lucide-react";
import { COLORS } from "../theme";
import Badge from "../components/Badge";
import { fetchContactChannels } from "../api";

const ICONS = { zalo: MessageCircle, facebook: Facebook };
const ICON_COLORS = { zalo: "#0068FF", facebook: "#1877F2" };

function ContactCard({ channel }) {
  const Icon = ICONS[channel.iconKey];
  const color = ICON_COLORS[channel.iconKey];

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "transform 200ms ease, border-color 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = COLORS.border;
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          background: `${color}1A`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: "15px", fontWeight: 700, color: COLORS.textMain, marginBottom: "6px" }}>{channel.name}</div>
        <p style={{ margin: 0, fontSize: "12.5px", color: COLORS.textSub, lineHeight: 1.55 }}>{channel.desc}</p>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {channel.badges.map((b) => (
          <Badge key={b} tone="muted">
            {b}
          </Badge>
        ))}
      </div>
      <a
        href={channel.url}
        target="_blank"
        rel="noreferrer"
        style={{
          marginTop: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          padding: "10px 0",
          borderRadius: "10px",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textMain,
          fontSize: "12.5px",
          fontWeight: 700,
          textDecoration: "none",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.background = `${color}0D`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = COLORS.border;
          e.currentTarget.style.background = "transparent";
        }}
      >
        Mở liên kết
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: "Phản hồi nhanh",
    desc: "Thường trong vòng 5–15 phút trong giờ hỗ trợ",
  },
  {
    icon: HeadphonesIcon,
    title: "Hỗ trợ chuyên nghiệp",
    desc: "Đội ngũ hỗ trợ giải đáp các vấn đề về sản phẩm",
  },
  {
    icon: Layers,
    title: "Đa kênh",
    desc: "Zalo & Facebook đều được hỗ trợ đầy đủ",
  },
];

export default function Contact() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactChannels()
      .then(setChannels)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: COLORS.textMain, display: "flex", alignItems: "center", gap: "8px" }}>
        <Phone size={20} style={{ color: COLORS.accent }} />
        Liên Hệ Hỗ Trợ
      </h1>
      <p style={{ margin: "6px 0 4px", fontSize: "13px", color: COLORS.textSub }}>Chọn kênh phù hợp để liên hệ với chúng tôi</p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: COLORS.success, marginBottom: "24px" }}>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: COLORS.success, display: "inline-block" }} />
        Hỗ trợ 8:00 – 23:00 hàng ngày
      </div>

      {loading ? (
        <div style={{ color: COLORS.textSub, fontSize: "13px", padding: "40px 0", textAlign: "center" }}>Đang tải kênh liên hệ...</div>
      ) : (
        <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px", marginBottom: "28px" }}>
          {channels.map((c) => (
            <ContactCard key={c.id} channel={c} />
          ))}
        </div>
      )}

      <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "14px", padding: "18px" }}>
              <Icon size={20} style={{ color: COLORS.accent, marginBottom: "10px" }} />
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.textMain, marginBottom: "6px" }}>{f.title}</div>
              <p style={{ margin: 0, fontSize: "12px", color: COLORS.textSub, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .contact-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .contact-grid { grid-template-columns: 1fr !important; }
          .feature-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
