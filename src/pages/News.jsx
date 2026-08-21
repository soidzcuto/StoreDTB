import React from "react";
import { Newspaper } from "lucide-react";
import { COLORS } from "../theme";

const POSTS = [
  {
    id: 1,
    title: "Hướng dẫn tối ưu hệ thống trước khi chơi game",
    excerpt: "Một số bước cơ bản giúp máy chạy mượt hơn trước khi vào game, từ dọn dẹp ổ đĩa đến cập nhật driver.",
    date: "12/8/2026",
  },
  {
    id: 2,
    title: "Cập nhật hệ thống nạp tiền tự động",
    excerpt: "DTB STORE vừa nâng cấp cổng thanh toán QR ngân hàng, rút ngắn thời gian xử lý giao dịch xuống dưới 1 phút.",
    date: "5/8/2026",
  },
  {
    id: 3,
    title: "Câu hỏi thường gặp về key sản phẩm",
    excerpt: "Tổng hợp các câu hỏi phổ biến về kích hoạt, gia hạn và reset HWID cho các sản phẩm đang bán.",
    date: "28/7/2026",
  },
];

export default function News() {
  return (
    <div style={{ maxWidth: "760px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 20px", color: COLORS.textMain, display: "flex", alignItems: "center", gap: "8px" }}>
        <Newspaper size={20} style={{ color: COLORS.accent }} />
        Tin tức &amp; Blog
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {POSTS.map((post) => (
          <div key={post.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px", padding: "18px" }}>
            <div style={{ fontSize: "11.5px", color: COLORS.textSub, marginBottom: "8px" }}>{post.date}</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: COLORS.textMain }}>{post.title}</h3>
            <p style={{ margin: 0, fontSize: "12.5px", color: COLORS.textSub, lineHeight: 1.6 }}>{post.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
