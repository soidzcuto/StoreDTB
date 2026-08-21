import React, { useEffect, useMemo, useRef, useState } from "react";
import { Zap, Copy, Check, Loader2, Landmark, Info, QrCode, RefreshCw, ArrowRight, CheckCircle2, Sparkles, X, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { COLORS } from "../theme";
import { useBalance, formatVND } from "../context/BalanceContext";
import { useAuth } from "../context/AuthContext";
import { createTopupRequest, subscribeTopupRequest } from "../api";
import { supabase } from "../supabase";
import Badge from "../components/Badge";

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000];

// Cấu hình tài khoản ngân hàng SePay (có thể cấu hình qua file .env)
const BANK_CONFIG = {
  bankCode: import.meta.env.VITE_SEPAY_BANK || "MBBank",
  bankName: import.meta.env.VITE_SEPAY_BANK_NAME || "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: import.meta.env.VITE_SEPAY_ACC || "0888888888",
  accountName: import.meta.env.VITE_SEPAY_NAME || "CONG TY TNHH GEARSTORE",
};

// Hàm phát âm thanh thông báo thành công (Web Audio API không cần tải file ngoài)
function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Nốt 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Nốt 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    // ignore
  }
}

function CopyField({ label, value, highlight = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div style={{ fontSize: "11px", color: COLORS.textSub, fontWeight: 600, marginBottom: "4px" }}>{label}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          border: `1px solid ${highlight ? "rgba(117,107,255,0.4)" : COLORS.border}`,
          borderRadius: "10px",
          padding: "10px 12px",
          background: highlight ? "rgba(117,107,255,0.06)" : "#0F1116",
        }}
      >
        <span
          style={{
            fontSize: "13.5px",
            fontWeight: 700,
            color: highlight ? "#9D95FF" : COLORS.textMain,
            wordBreak: "break-all",
            fontFamily: highlight ? "monospace" : "inherit",
            letterSpacing: highlight ? "0.04em" : "normal",
          }}
        >
          {value}
        </span>
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0,
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
            transition: "color 150ms ease, border-color 150ms ease",
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Đã chép" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function TopUp() {
  const { balance, setBalance, formatted } = useBalance();
  const { user, profile, refreshProfile } = useAuth();

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle | creating | pending | success
  const [currentRequest, setCurrentRequest] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const pollIntervalRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const amount = selectedAmount ?? (Number(customAmount) || 0);

  // Sinh mã nội dung chuyển khoản chuẩn SePay (chữ liền không dấu cách, vd: GS839102)
  const generateTransferCode = () => {
    const randDigits = Math.floor(100000 + Math.random() * 900000);
    return `GS${randDigits}`;
  };

  // Tạo URL mã QR thanh toán SePay
  const qrUrl = useMemo(() => {
    if (!currentRequest) return "";
    const { transfer_content, amount: reqAmount } = currentRequest;
    return `https://qr.sepay.vn/img?acc=${BANK_CONFIG.accountNumber}&bank=${BANK_CONFIG.bankCode}&amount=${reqAmount}&des=${encodeURIComponent(
      transfer_content
    )}`;
  }, [currentRequest]);

  // Xử lý khi thanh toán thành công
  const handlePaymentSuccess = async (updatedRequest) => {
    setPaymentStatus("success");
    playSuccessChime();

    const addedAmount = updatedRequest?.paid_amount || updatedRequest?.amount || amount;
    
    // Dừng polling và subscription ngay lập tức
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Tải lại số dư mới nhất từ Supabase
    try {
      const { data: freshProfile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      const newBal = freshProfile?.balance ?? (balance + addedAmount);
      setBalance(newBal);
      if (refreshProfile) {
        refreshProfile({ balance: newBal });
      }

      setSuccessData({
        amount: addedAmount,
        newBalance: newBal,
        transferContent: currentRequest?.transfer_content || updatedRequest?.transfer_content,
        time: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
      });
      setShowSuccessModal(true);
    } catch (e) {
      console.error("Lỗi cập nhật số dư sau nạp:", e);
      setSuccessData({
        amount: addedAmount,
        newBalance: balance + addedAmount,
        transferContent: currentRequest?.transfer_content,
        time: new Date().toLocaleTimeString("vi-VN"),
      });
      setShowSuccessModal(true);
    }
  };

  // Bắt đầu tạo yêu cầu nạp tiền
  const startPayment = async () => {
    if (amount <= 0 || !user) return;
    setErrorMessage("");
    setPaymentStatus("creating");

    const initialBal = balance;

    try {
      const transferContent = generateTransferCode();

      // Lưu yêu cầu vào Supabase topup_requests
      const reqData = await createTopupRequest({
        userId: user.id,
        amount: amount,
        transferContent: transferContent,
      });

      setCurrentRequest(reqData);
      setPaymentStatus("pending");

      // 1. Lắng nghe Realtime từ Supabase (bảng topup_requests & bảng profiles)
      if (unsubscribeRef.current) unsubscribeRef.current();
      const channel = supabase
        .channel(`topup-monitor-${reqData.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "topup_requests",
            filter: `id=eq.${reqData.id}`,
          },
          (payload) => {
            if (payload.new?.status === "success") {
              handlePaymentSuccess(payload.new);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new?.balance > initialBal) {
              handlePaymentSuccess(reqData);
            }
          }
        )
        .subscribe();

      unsubscribeRef.current = () => supabase.removeChannel(channel);

      // 2. Polling đa lớp mỗi 2 giây (kiểm tra cả bảng topup_requests và bảng profiles)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Lớp 1: Kiểm tra request
          const { data: reqCheck } = await supabase
            .from("topup_requests")
            .select("status, paid_amount, transfer_content")
            .eq("id", reqData.id)
            .maybeSingle();

          if (reqCheck && reqCheck.status === "success") {
            handlePaymentSuccess(reqCheck);
            return;
          }

          // Lớp 2: Kiểm tra số dư profile trực tiếp
          const { data: profCheck } = await supabase
            .from("profiles")
            .select("balance")
            .eq("id", user.id)
            .maybeSingle();

          if (profCheck && profCheck.balance > initialBal) {
            handlePaymentSuccess(reqData);
            return;
          }
        } catch (err) {
          console.warn("Polling topup check:", err);
        }
      }, 2000);
    } catch (err) {
      console.error("Lỗi tạo yêu cầu nạp tiền:", err);
      setErrorMessage("Không thể tạo yêu cầu nạp tiền. Vui lòng thử lại sau.");
      setPaymentStatus("idle");
    }
  };

  // Dọn dẹp listener khi unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const reset = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (unsubscribeRef.current) unsubscribeRef.current();
    setPaymentStatus("idle");
    setCurrentRequest(null);
    setSelectedAmount(null);
    setCustomAmount("");
    setErrorMessage("");
    setShowSuccessModal(false);
  };

  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* Banner thông báo nạp thành công nổi bật */}
      {paymentStatus === "success" && successData && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
            boxShadow: "0 8px 24px rgba(34,197,94,0.15)",
            animation: "slideDown 300ms ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#22C55E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={24} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "6px" }}>
                Nạp tiền thành công! <Sparkles size={15} color="#F59E0B" />
              </div>
              <div style={{ fontSize: "12.5px", color: "#A7F3D0", marginTop: "2px" }}>
                Đã cộng <b>+{formatVND(successData.amount)}</b> vào tài khoản. Số dư hiện tại: <b style={{ color: "#FFFFFF" }}>{formatVND(successData.newBalance)}</b>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowSuccessModal(true)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "#FFFFFF",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Xem hóa đơn
            </button>
            <Link
              to="/"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#22C55E",
                color: "#FFFFFF",
                fontSize: "12.5px",
                fontWeight: 700,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              Mua hàng ngay <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: COLORS.textMain, display: "flex", alignItems: "center", gap: "10px" }}>
            Nạp tiền tài khoản
            <Badge tone="success">
              <Zap size={11} /> Tự động SePay 24/7
            </Badge>
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: COLORS.textSub }}>
            Số dư hiện tại: <b style={{ color: COLORS.textMain }}>{formatted}</b>
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }} className="topup-grid">
        {/* LEFT: Chọn số tiền */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Landmark size={16} style={{ color: COLORS.accent }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMain }}>Phương thức thanh toán</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: `1px solid ${COLORS.accent}`,
              background: "rgba(117,107,255,0.08)",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: COLORS.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <QrCode size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.textMain }}>Chuyển khoản VietQR / SePay</div>
              <div style={{ fontSize: "11.5px", color: COLORS.textSub }}>Quét mã QR mọi ngân hàng &amp; ví điện tử, cộng tiền sau 2-5 giây</div>
            </div>
          </div>

          <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textMain, marginBottom: "10px" }}>Chọn số tiền nhanh</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
            {QUICK_AMOUNTS.map((amt) => {
              const isActive = selectedAmount === amt;
              return (
                <button
                  key={amt}
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount("");
                    if (paymentStatus !== "idle") reset();
                  }}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "10px",
                    border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                    background: isActive ? "rgba(117,107,255,0.14)" : "transparent",
                    color: isActive ? COLORS.textMain : COLORS.textSub,
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 180ms ease",
                  }}
                >
                  {formatVND(amt)}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textMain, marginBottom: "10px" }}>Hoặc nhập số tiền tùy ý</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <span style={{ padding: "12px 14px", background: "#0F1116", color: COLORS.textSub, fontSize: "12.5px", fontWeight: 700 }}>
              VND
            </span>
            <input
              value={customAmount ? Number(customAmount).toLocaleString("vi-VN") : ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                setCustomAmount(v);
                setSelectedAmount(null);
                if (paymentStatus !== "idle") reset();
              }}
              placeholder="Tối thiểu 10.000đ"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: COLORS.textMain,
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px 14px",
              }}
            />
          </div>

          {errorMessage && (
            <div style={{ color: "#EF4444", fontSize: "12.5px", marginBottom: "12px" }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <button
            onClick={startPayment}
            disabled={amount < 1000 || paymentStatus === "creating" || paymentStatus === "pending"}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: "10px",
              border: "none",
              background: amount >= 1000 && paymentStatus !== "pending" ? COLORS.accent : "rgba(139,147,161,0.15)",
              color: amount >= 1000 && paymentStatus !== "pending" ? "#fff" : COLORS.textSub,
              fontSize: "14px",
              fontWeight: 700,
              cursor: amount >= 1000 && paymentStatus !== "pending" ? "pointer" : "not-allowed",
              transition: "filter 150ms ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => amount >= 1000 && (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            {paymentStatus === "creating" ? (
              <>
                <Loader2 size={16} className="spin" /> Đang tạo mã QR...
              </>
            ) : paymentStatus === "pending" ? (
              <>
                <Loader2 size={16} className="spin" /> Đang chờ chuyển khoản...
              </>
            ) : (
              <>Tạo mã QR Nạp tiền {amount > 0 ? `— ${formatVND(amount)}` : ""}</>
            )}
          </button>
        </div>

        {/* RIGHT: Khung hiển thị QR SePay và thông tin chuyển khoản */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column" }}>
          {paymentStatus === "idle" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "30px 10px", color: COLORS.textSub }}>
              <QrCode size={48} style={{ color: "rgba(117,107,255,0.35)", marginBottom: "14px" }} />
              <div style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMain, marginBottom: "6px" }}>Chưa có mã thanh toán</div>
              <p style={{ margin: 0, fontSize: "12.5px", maxWidth: "260px" }}>Chọn hoặc nhập số tiền bên trái rồi bấm <b>"Tạo mã QR Nạp tiền"</b> để quét thanh toán tự động.</p>
            </div>
          )}

          {paymentStatus === "creating" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 10px" }}>
              <Loader2 size={32} className="spin" style={{ color: COLORS.accent, marginBottom: "12px" }} />
              <span style={{ fontSize: "13px", color: COLORS.textSub }}>Đang kết nối cổng SePay...</span>
            </div>
          )}

          {(paymentStatus === "pending" || paymentStatus === "success") && currentRequest && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMain }}>
                  {paymentStatus === "success" ? "Giao dịch thành công!" : "Mã QR Thanh toán"}
                </div>
                {paymentStatus === "pending" && (
                  <Badge tone="accent">
                    <Loader2 size={10} className="spin" /> Đang đợi bạn quét mã
                  </Badge>
                )}
              </div>
              <p style={{ margin: "0 0 16px", fontSize: "12px", color: COLORS.textSub }}>
                Mở app Ngân hàng / Momo / ZaloPay để quét mã QR bên dưới
              </p>

              {/* QR Image */}
              <div
                style={{
                  alignSelf: "center",
                  width: "210px",
                  height: "210px",
                  borderRadius: "14px",
                  border: `1px solid ${paymentStatus === "success" ? "rgba(34,197,94,0.5)" : COLORS.border}`,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px",
                  marginBottom: "18px",
                  position: "relative",
                  boxShadow: paymentStatus === "success" ? "0 0 20px rgba(34,197,94,0.2)" : "none",
                }}
              >
                {paymentStatus === "success" ? (
                  <div style={{ textAlign: "center", color: "#16A34A" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                      <Check size={36} color="#16A34A" />
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 800 }}>ĐÃ CỘNG TIỀN!</div>
                    <div style={{ fontSize: "12px", color: "#4B5563", marginTop: "2px" }}>+{formatVND(currentRequest.amount)}</div>
                  </div>
                ) : (
                  <img
                    src={qrUrl}
                    alt="VietQR SePay"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                )}
              </div>

              {/* Chi tiết chuyển khoản */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                <CopyField label="Ngân hàng thụ hưởng" value={BANK_CONFIG.bankName} />
                <CopyField label="Số tài khoản" value={BANK_CONFIG.accountNumber} />
                <CopyField label="Tên người thụ hưởng" value={BANK_CONFIG.accountName} />
                <CopyField label="Số tiền cần chuyển" value={formatVND(currentRequest.amount)} highlight />
                <CopyField label="Nội dung chuyển khoản (Bắt buộc chính xác)" value={currentRequest.transfer_content} highlight />
              </div>

              {/* Status Box */}
              <div
                style={{
                  borderRadius: "12px",
                  border: `1px solid ${paymentStatus === "success" ? "rgba(34,197,94,0.4)" : "rgba(117,107,255,0.3)"}`,
                  background: paymentStatus === "success" ? "rgba(34,197,94,0.08)" : "#0F1116",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {paymentStatus === "pending" && (
                  <>
                    <Loader2 size={16} className="spin" style={{ color: COLORS.accent }} />
                    <div style={{ fontSize: "12.5px", color: COLORS.textMain, fontWeight: 600 }}>
                      Hệ thống đang tự động kiểm tra giao dịch...
                    </div>
                  </>
                )}
                {paymentStatus === "success" && (
                  <>
                    <Check size={16} style={{ color: COLORS.success }} />
                    <div style={{ fontSize: "13px", color: COLORS.success, fontWeight: 700 }}>
                      Nạp thành công +{formatVND(currentRequest.amount)} vào tài khoản!
                    </div>
                  </>
                )}
              </div>

              {paymentStatus === "success" ? (
                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    onClick={reset}
                    style={{
                      flex: 1,
                      padding: "11px 0",
                      borderRadius: "10px",
                      border: `1px solid ${COLORS.border}`,
                      background: "transparent",
                      color: COLORS.textMain,
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Nạp tiếp
                  </button>
                  <Link
                    to="/"
                    style={{
                      flex: 1,
                      padding: "11px 0",
                      borderRadius: "10px",
                      border: "none",
                      background: COLORS.accent,
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 700,
                      textAlign: "center",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    Mua sắm ngay <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <button
                  onClick={reset}
                  style={{
                    marginTop: "12px",
                    padding: "9px 0",
                    borderRadius: "10px",
                    border: `1px solid ${COLORS.border}`,
                    background: "transparent",
                    color: COLORS.textSub,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <RefreshCw size={12} /> Hủy và tạo giao dịch khác
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* POPUP MODAL THÔNG BÁO NẠP TIỀN THÀNH CÔNG */}
      {showSuccessModal && successData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            animation: "fadeIn 200ms ease",
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#12151E",
              border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: "22px",
              padding: "28px",
              position: "relative",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(34,197,94,0.2)",
              animation: "scaleUp 250ms ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8B95A8",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>

            {/* Glowing Icon */}
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #22C55E, #16A34A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 0 25px rgba(34,197,94,0.45)",
              }}
            >
              <CheckCircle2 size={40} color="#FFFFFF" />
            </div>

            <div style={{ fontSize: "20px", fontWeight: 800, color: "#FFFFFF", marginBottom: "6px" }}>
              Nạp tiền thành công!
            </div>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#8B95A8", lineHeight: 1.5 }}>
              Hệ thống SePay đã ghi nhận thanh toán và cộng tiền vào tài khoản của bạn.
            </p>

            {/* Receipt Box */}
            <div
              style={{
                background: "#090B10",
                border: "1px solid #1C2030",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "22px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#8B95A8" }}>Số tiền nạp:</span>
                <b style={{ color: "#22C55E", fontSize: "15px" }}>+{formatVND(successData.amount)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#8B95A8" }}>Số dư mới:</span>
                <b style={{ color: "#FFFFFF" }}>{formatVND(successData.newBalance)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#8B95A8" }}>Mã nội dung:</span>
                <span style={{ color: "#9D95FF", fontFamily: "monospace", fontWeight: 700 }}>{successData.transferContent}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#8B95A8" }}>Thời gian:</span>
                <span style={{ color: "#D1D5DB" }}>{successData.time}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  reset();
                }}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: "10px",
                  border: "1px solid #23293D",
                  background: "#161A26",
                  color: "#FFFFFF",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Nạp tiếp
              </button>
              <Link
                to="/"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  flex: 1.2,
                  padding: "12px 0",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                  color: "#FFFFFF",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                }}
              >
                Mua hàng ngay <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          border: `1px solid ${COLORS.border}`,
          borderRadius: "14px",
          padding: "16px 18px",
          background: "rgba(245,185,66,0.06)",
          display: "flex",
          gap: "10px",
        }}
      >
        <Info size={17} style={{ color: "#F5B942", flexShrink: 0, marginTop: "1px" }} />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.textMain, marginBottom: "6px" }}>
            Lưu ý &amp; Hướng dẫn thanh toán tự động SePay
          </div>
          <ul style={{ margin: 0, paddingLeft: "18px", color: COLORS.textSub, fontSize: "12.5px", lineHeight: 1.8 }}>
            <li>Quét mã QR bằng App ngân hàng để hệ thống tự động điền <b>Đúng số tiền</b> và <b>Đúng nội dung</b>.</li>
            <li>Nếu chuyển khoản thủ công, vui lòng nhập chính xác <b>Nội dung chuyển khoản</b> để hệ thống cộng tiền tự động trong 2 - 5 giây.</li>
            <li>Sau khi chuyển khoản thành công, màn hình sẽ hiển thị <b>Thông báo nạp tiền thành công</b> kèm hóa đơn chi tiết.</li>
            <li>Nếu quá 5 phút chưa nhận được tiền, vui lòng liên hệ bộ phận hỗ trợ kèm mã giao dịch.</li>
          </ul>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .topup-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
