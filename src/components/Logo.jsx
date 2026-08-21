import React, { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../theme";

// Cấu hình URL Logo mặc định (có thể chỉnh trong file .env hoặc dán file vào /public/logo.png)
const DEFAULT_LOGO_IMAGE = import.meta.env.VITE_LOGO_URL || "/logo.png";
const BRAND_NAME = import.meta.env.VITE_BRAND_NAME || "GearStore";

export default function Logo({
  src,
  size = 50,
  maxWidth = "200px",
  maxHeight,
  showText = false, // Mặc định chỉ dùng ảnh Logo, không kèm chữ text
  href = "/",
  style = {},
  imgStyle = {},
}) {
  const [imgError, setImgError] = useState(false);
  const logoSrc = src || DEFAULT_LOGO_IMAGE;
  const effectiveMaxHeight = maxHeight || `${Math.max(size, 60)}px`;

  const content = (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-start",
        cursor: href ? "pointer" : "default",
        textDecoration: "none",
        width: "100%",
        ...style,
      }}
    >
      {!imgError ? (
        <img
          src={logoSrc}
          alt={BRAND_NAME}
          onError={() => setImgError(true)}
          style={{
            height: "auto",
            maxHeight: effectiveMaxHeight,
            width: "100%",
            maxWidth: maxWidth,
            objectFit: "contain",
            borderRadius: "6px",
            display: "block",
            ...imgStyle,
          }}
        />
      ) : (
        /* Fallback nếu chưa up ảnh hoặc link ảnh lỗi */
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "10px",
            background: `linear-gradient(135deg, ${COLORS.accent}, #4A3FE0)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: `${Math.round(size * 0.45)}px`,
            color: "#FFFFFF",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(117,107,255,0.3)",
          }}
        >
          {BRAND_NAME.charAt(0)}
        </div>
      )}

      {showText && (
        <span
          style={{
            fontSize: `${Math.max(15, Math.round(size * 0.48))}px`,
            fontWeight: 800,
            color: COLORS.textMain,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            marginLeft: "10px",
          }}
        >
          {BRAND_NAME}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} style={{ textDecoration: "none", display: "inline-flex", width: "100%", alignItems: "center" }}>
        {content}
      </Link>
    );
  }

  return content;
}
