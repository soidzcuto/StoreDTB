import React, { useEffect, useMemo, useState } from "react";
import { Package, Copy, Check, RefreshCcw, Clock, StickyNote } from "lucide-react";
import { COLORS } from "../theme";
import { useBalance } from "../context/BalanceContext";
import { useAuth } from "../context/AuthContext";
import { fetchOrders, resetOrderHwid } from "../api";
import Badge from "../components/Badge";

const STATUS_MAP = {
  success: { label: "Thành công", tone: "success" },
  processing: { label: "Đang xử lý", tone: "accent" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  expired: { label: "Hết hạn", tone: "muted" },
};

const HWID_COOLDOWN_SECONDS = 6 * 3600; // 6 tiếng = 21600s

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return "0s";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  if (m > 0) {
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${s}s`;
}

function calculateHwidRemainingSeconds(lastResetAt) {
  if (!lastResetAt) return 0;
  const lastTime = new Date(lastResetAt).getTime();
  if (isNaN(lastTime)) return 0;
  const elapsed = Math.floor((Date.now() - lastTime) / 1000);
  return Math.max(0, HWID_COOLDOWN_SECONDS - elapsed);
}

function CopyKeyButton({ value, label = "Copy Key" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
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
        padding: "7px 12px",
        borderRadius: "8px",
        border: `1px solid ${COLORS.border}`,
        background: "transparent",
        color: copied ? COLORS.success : COLORS.textMain,
        fontSize: "12px",
        fontWeight: 700,
        cursor: "pointer",
        transition: "color 150ms ease",
        flexShrink: 0,
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Đã chép" : label}
    </button>
  );
}

function OrderCard({ order, onHwidReset }) {
  const status = STATUS_MAP[order.status] || { label: order.status, tone: "muted" };

  const isToken =
    order.productType === "token" ||
    (order.productName || "").toLowerCase().includes("token") ||
    (order.packageName || "").toLowerCase().includes("token") ||
    order.supportsHwidReset === false;

  const [remaining, setRemaining] = useState(() =>
    calculateHwidRemainingSeconds(order.lastHwidResetAt)
  );
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setRemaining(calculateHwidRemainingSeconds(order.lastHwidResetAt));
  }, [order.lastHwidResetAt]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const handleResetHwid = async () => {
    if (remaining > 0 || resetting) return;
    const confirmReset = window.confirm(
      `Bạn có chắc chắn muốn Reset HWID cho key này không?\n\nLưu ý: Sau khi reset, bạn phải đợi 6 tiếng nữa mới có thể reset lần tiếp theo.`
    );
    if (!confirmReset) return;

    setResetting(true);
    try {
      const nowIso = new Date().toISOString();
      await resetOrderHwid(order.id);
      setRemaining(HWID_COOLDOWN_SECONDS);
      if (onHwidReset) onHwidReset(order.id, nowIso);
      alert("✅ Reset HWID thành công! Bạn có thể gán máy mới. Lần reset tiếp theo sau 6 tiếng.");
    } catch (err) {
      console.error("Lỗi khi reset HWID:", err);
      alert("Có lỗi xảy ra khi reset HWID. Vui lòng thử lại sau.");
    } finally {
      setResetting(false);
    }
  };

  const isCooldown = remaining > 0;

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px", padding: "18px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #171A22, #0E1015)",
              border: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Package size={22} style={{ color: "rgba(117,107,255,0.5)" }} />
          </div>
          <div>
            <div style={{ fontSize: "14.5px", fontWeight: 700, color: COLORS.textMain }}>{order.productName}</div>
            <div style={{ fontSize: "12px", color: COLORS.textSub, marginTop: "2px" }}>{order.packageName}</div>
          </div>
        </div>
        <Badge tone={status.tone}>● {status.label}</Badge>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          fontSize: "12px",
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "12px 0",
          marginBottom: "14px",
        }}
        className="order-meta-grid"
      >
        <div>
          <div style={{ color: COLORS.textSub, marginBottom: "3px" }}>Mã đơn</div>
          <div style={{ color: COLORS.textMain, fontWeight: 600 }}>{order.id}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textSub, marginBottom: "3px" }}>Số tiền</div>
          <div style={{ color: COLORS.textMain, fontWeight: 600 }}>{order.amount.toLocaleString("vi-VN")}đ</div>
        </div>
        <div>
          <div style={{ color: COLORS.textSub, marginBottom: "3px" }}>Thời gian mua</div>
          <div style={{ color: COLORS.textMain, fontWeight: 600 }}>{order.purchasedAt}</div>
        </div>
        <div>
          <div style={{ color: COLORS.textSub, marginBottom: "3px" }}>Hoàn thành lúc</div>
          <div style={{ color: COLORS.textMain, fontWeight: 600 }}>{order.completedAt || "—"}</div>
        </div>
      </div>

      {order.adminNote && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            border: "1px solid rgba(245,185,66,0.35)",
            background: "rgba(245,185,66,0.08)",
            borderRadius: "12px",
            padding: "12px 14px",
            marginBottom: "14px",
          }}
        >
          <StickyNote size={15} style={{ color: "#F5B942", flexShrink: 0, marginTop: "1px" }} />
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#F5B942", letterSpacing: "0.04em", marginBottom: "4px" }}>
              GHI CHÚ TỪ ADMIN
            </div>
            <div style={{ fontSize: "12.5px", color: COLORS.textSub, lineHeight: 1.6 }}>{order.adminNote}</div>
          </div>
        </div>
      )}

      {order.productKey && (
        isToken ? (
          /* HIỂN THỊ DÀNH CHO SẢN PHẨM TOKEN (KHÔNG CÓ RESET HWID) */
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "14px", background: "#0F1116" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#818CF8", letterSpacing: "0.04em" }}>
                DANH SÁCH TOKEN
              </div>
              <CopyKeyButton value={order.productKey} label="Copy Token" />
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#6C7BFF",
                whiteSpace: "pre-line",
                lineHeight: 1.6,
                background: "#141724",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #202638",
                maxHeight: "180px",
                overflowY: "auto",
              }}
            >
              {order.productKey}
            </div>
          </div>
        ) : (
          /* HIỂN THỊ DÀNH CHO SẢN PHẨM KEY BẢN QUYỀN (CÓ RESET HWID 6H) */
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "14px", background: "#0F1116" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.textSub, letterSpacing: "0.04em", marginBottom: "8px" }}>
              KEY SẢN PHẨM
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#6C7BFF",
                  whiteSpace: "pre-line",
                  lineHeight: 1.5,
                }}
              >
                {order.productKey}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CopyKeyButton value={order.productKey} label="Copy Key" />
                {order.supportsHwidReset && (
                  <button
                    disabled={isCooldown || resetting}
                    onClick={handleResetHwid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "7px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${isCooldown ? "#202638" : COLORS.border}`,
                      background: isCooldown ? "#141724" : "transparent",
                      color: isCooldown ? "#6A758E" : COLORS.textSub,
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: isCooldown || resetting ? "not-allowed" : "pointer",
                      transition: "all 150ms ease",
                    }}
                  >
                    <RefreshCcw size={13} style={{ animation: resetting ? "spin 1s linear infinite" : "none" }} />
                    Reset HWID
                  </button>
                )}
              </div>
            </div>

            {/* Đồng hồ đếm ngược Reset HWID 6h */}
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
              {isCooldown ? (
                <span style={{ color: COLORS.textSub, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={13} /> Còn {formatCountdown(remaining)}
                </span>
              ) : (
                <span style={{ color: COLORS.success, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={13} /> Có thể reset HWID ngay
                </span>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function Orders() {
  const { formatted } = useBalance();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    fetchOrders(user.id)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleHwidResetSuccess = (orderId, resetTimeIso) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, lastHwidResetAt: resetTimeIso } : o))
    );
  };

  const totalSpent = useMemo(
    () => orders.reduce((sum, o) => (o.status === "success" ? sum + o.amount : sum), 0),
    [orders]
  );
  const successCount = useMemo(
    () => orders.filter((o) => o.status === "success").length,
    [orders]
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: COLORS.textMain }}>Đơn hàng của tôi</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: COLORS.textSub }}>Quản lý key bản quyền và đơn hàng đã thanh toán</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "8px 14px", fontSize: "12px" }}>
            <span style={{ color: COLORS.textSub }}>Thành công: </span>
            <b style={{ color: COLORS.success }}>{successCount}</b>
          </div>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "8px 14px", fontSize: "12px" }}>
            <span style={{ color: COLORS.textSub }}>Tổng chi: </span>
            <b style={{ color: COLORS.accent }}>{totalSpent.toLocaleString("vi-VN")}đ</b>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: COLORS.textSub, fontSize: "13px" }}>
          Đang tải đơn hàng...
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
            color: COLORS.textSub,
          }}
        >
          <Package size={40} style={{ margin: "0 auto 12px", color: "rgba(117,107,255,0.3)" }} />
          <div style={{ fontSize: "15px", fontWeight: 700, color: COLORS.textMain, marginBottom: "4px" }}>Chưa có đơn hàng nào</div>
          <div style={{ fontSize: "12.5px" }}>Khi bạn mua sản phẩm, key và thông tin đơn hàng sẽ hiển thị tại đây.</div>
        </div>
      ) : (
        orders.map((order) => (
          <OrderCard key={order.id} order={order} onHwidReset={handleHwidResetSuccess} />
        ))
      )}
    </div>
  );
}
