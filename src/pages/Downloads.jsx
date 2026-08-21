import React, { useEffect, useMemo, useState } from "react";
import { Download, Search, FileDown, Copy, Check, PlayCircle, BookOpen, HardDrive } from "lucide-react";
import { COLORS } from "../theme";
import { fetchDownloads, fetchDownloadCategories } from "../api";
import Badge from "../components/Badge";

function DownloadCard({ item }) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = item.image_url || item.image;

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: "128px",
          background: "linear-gradient(135deg, #171A22, #0E1015)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={item.name}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <HardDrive size={34} style={{ color: "rgba(117,107,255,0.35)" }} />
        )}
        <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
          <Badge tone="muted">{item.categoryLabel}</Badge>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: COLORS.textMain, wordBreak: "break-word", lineHeight: 1.35 }}>
          {item.name}
        </h3>
        <p style={{ margin: "6px 0 12px", fontSize: "12px", color: COLORS.textSub, lineHeight: 1.5 }}>{item.desc}</p>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: COLORS.textSub, marginBottom: "14px" }}>
          <span>{item.downloads} lượt tải</span>
          <span>{item.size}</span>
        </div>

        {(item.hasVideo || item.hasGuide) && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            {item.hasVideo && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: COLORS.textSub }}>
                <PlayCircle size={13} /> VIDEO HD
              </span>
            )}
            {item.hasGuide && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: COLORS.textSub }}>
                <BookOpen size={13} /> HƯỚNG DẪN
              </span>
            )}
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={() => {
              const link = item.download_url || item.downloadUrl;
              if (link) {
                window.open(link, "_blank", "noopener,noreferrer");
              } else {
                alert("Mục này chưa có link tải xuống trong cơ sở dữ liệu.");
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              padding: "10px 0",
              borderRadius: "10px",
              border: "none",
              background: COLORS.accent,
              color: "#fff",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "filter 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            <FileDown size={14} />
            TẢI XUỐNG NGAY
          </button>
          <button
            onClick={async () => {
              const link = item.download_url || item.downloadUrl || window.location.href;
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              padding: "9px 0",
              borderRadius: "10px",
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              color: copied ? COLORS.success : COLORS.textSub,
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "color 150ms ease",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "ĐÃ SAO CHÉP" : "SAO CHÉP LINK"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Downloads() {
  const [downloads, setDownloads] = useState([]);
  const [downloadCategories, setDownloadCategories] = useState([{ key: "all", label: "Tất cả" }]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([fetchDownloads(), fetchDownloadCategories()])
      .then(([dl, cats]) => {
        setDownloads(dl);
        setDownloadCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return downloads.filter((d) => {
      const matchesCategory = category === "all" || d.category === category;
      const matchesSearch = d.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, search, downloads]);

  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 16px", color: COLORS.textMain, display: "flex", alignItems: "center", gap: "8px" }}>
        <Download size={20} style={{ color: COLORS.accent }} />
        Tải xuống
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: "10px",
          padding: "10px 14px",
          maxWidth: "360px",
          marginBottom: "18px",
        }}
      >
        <Search size={16} style={{ color: COLORS.textSub, flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm..."
          style={{ background: "transparent", border: "none", outline: "none", color: COLORS.textMain, fontSize: "13.5px", width: "100%" }}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "20px" }}>
        {downloadCategories.map((c) => {
          const isActive = category === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                flexShrink: 0,
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: "12.5px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                cursor: "pointer",
                border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                background: isActive ? COLORS.accent : "transparent",
                color: isActive ? "#fff" : COLORS.textSub,
                transition: "all 180ms ease",
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ color: COLORS.textSub, fontSize: "13px", padding: "40px 0", textAlign: "center" }}>Đang tải danh sách...</div>
      ) : filtered.length === 0 ? (
        <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: "16px", padding: "50px 20px", textAlign: "center", color: COLORS.textSub, fontSize: "13.5px" }}>
          Không tìm thấy tệp phù hợp.
        </div>
      ) : (
        <div className="download-grid">
          {filtered.map((item) => (
            <DownloadCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <style>{`
        .download-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        @media (max-width: 1280px) {
          .download-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .download-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .download-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
