import React, { useState } from "react";
import { Package, Check } from "lucide-react";
import { COLORS } from "../theme";
import Badge from "./Badge";

export default function ProductCard({ product, onBuy }) {
  const [hover, setHover] = useState(false);
  const outOfStock = product.status === "out" || product.stock === 0;

  const imageUrl = product.image_url || product.image;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onBuy && onBuy(product)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: COLORS.card,
        border: `1px solid ${hover ? "rgba(117,107,255,0.45)" : COLORS.border}`,
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover ? "0 10px 24px rgba(117,107,255,0.10)" : "none",
        transition: "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: "140px",
          position: "relative",
          background: "linear-gradient(135deg, #171A22, #0E1015)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <Package size={40} style={{ color: "rgba(117,107,255,0.35)" }} />
        )}
        <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
          <Badge tone={outOfStock ? "danger" : "success"}>{outOfStock ? "HẾT HÀNG" : "CÒN HÀNG"}</Badge>
        </div>
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 2 }}>
          <Badge tone="muted">{product.categoryLabel}</Badge>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: COLORS.textMain, lineHeight: 1.3 }}>{product.name}</h3>
        <p style={{ margin: "6px 0 12px", fontSize: "12px", color: COLORS.textSub, lineHeight: 1.5 }}>{product.desc}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
          {product.features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <Check size={13} style={{ color: COLORS.success, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: COLORS.textSub }}>{f}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: COLORS.textSub,
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: "10px",
            marginTop: "auto",
            marginBottom: "14px",
          }}
        >
          <span>
            Kho: <b style={{ color: COLORS.textMain }}>{product.stock}</b>
          </span>
          <span>
            Gói: <b style={{ color: COLORS.textMain }}>{product.pack}</b>
          </span>
          <span>
            Đã bán: <b style={{ color: COLORS.textMain }}>{product.sold}</b>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div>
            <div style={{ fontSize: "10px", color: COLORS.textSub, fontWeight: 700 }}>TỪ</div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: COLORS.textMain }}>{product.price}</div>
          </div>
          <button
            disabled={outOfStock}
            onClick={(e) => {
              e.stopPropagation();
              if (onBuy) onBuy(product);
            }}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              border: "none",
              fontSize: "12.5px",
              fontWeight: 700,
              letterSpacing: "0.03em",
              cursor: outOfStock ? "not-allowed" : "pointer",
              background: outOfStock ? "rgba(139,147,161,0.15)" : COLORS.accent,
              color: outOfStock ? COLORS.textSub : "#fff",
              transition: "filter 150ms ease, transform 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (!outOfStock) e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseLeave={(e) => {
              if (!outOfStock) e.currentTarget.style.filter = "brightness(1)";
            }}
            onMouseDown={(e) => {
              if (!outOfStock) e.currentTarget.style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              if (!outOfStock) e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {outOfStock ? "HẾT HÀNG" : "MUA"}
          </button>
        </div>
      </div>
    </div>
  );
}
