import React, { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { COLORS } from "../theme";
import Badge from "../components/Badge";

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/products", desc: "Lấy danh sách sản phẩm và tồn kho hiện tại." },
  { method: "POST", path: "/api/v1/orders", desc: "Tạo đơn hàng mới cho một sản phẩm." },
  { method: "GET", path: "/api/v1/orders/:id", desc: "Tra cứu trạng thái và key của một đơn hàng." },
  { method: "GET", path: "/api/v1/balance", desc: "Kiểm tra số dư tài khoản seller." },
];

const METHOD_COLOR = { GET: COLORS.success, POST: COLORS.accent };

export default function ApiSeller() {
  const [copied, setCopied] = useState(false);
  const apiKey = "sk_live_51Hj9•••••••••••••••XQ2";

  return (
    <div style={{ maxWidth: "760px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 8px", color: COLORS.textMain, display: "flex", alignItems: "center", gap: "8px" }}>
        <Code2 size={20} style={{ color: COLORS.accent }} />
        API Seller
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: "13px", color: COLORS.textSub }}>
        Kết nối hệ thống của bạn với GearStore để tự động hoá tạo đơn và tra cứu key.
      </p>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px", padding: "18px", marginBottom: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: COLORS.textSub, marginBottom: "10px" }}>API KEY CỦA BẠN</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "10px 12px", background: "#0F1116" }}>
          <span style={{ fontFamily: "monospace", fontSize: "13px", color: COLORS.textMain }}>{apiKey}</span>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(apiKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 10px",
              borderRadius: "8px",
              border: `1px solid ${COLORS.border}`,
              background: "transparent",
              color: copied ? COLORS.success : COLORS.textSub,
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Đã chép" : "Copy"}
          </button>
        </div>
      </div>

      <div style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMain, marginBottom: "12px" }}>Endpoints</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {ENDPOINTS.map((ep) => (
          <div key={ep.path} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <Badge tone={ep.method === "GET" ? "success" : "accent"}>{ep.method}</Badge>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: COLORS.textMain }}>{ep.path}</div>
              <div style={{ fontSize: "12px", color: COLORS.textSub, marginTop: "4px" }}>{ep.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
