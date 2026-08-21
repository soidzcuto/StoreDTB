import React, { useState, useEffect } from "react";
import {
  X,
  ShoppingCart,
  Check,
  Tag,
  CheckCircle,
  Copy,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBalance, formatVND } from "../context/BalanceContext";
import { useAuth } from "../context/AuthContext";
import { createOrder, createTransaction, claimProductKeys } from "../api";

// Các mã giảm giá demo
const DISCOUNT_CODES = {
  GEAR10: { type: "percent", value: 10, label: "Giảm 10%" },
  GEAR20: { type: "percent", value: 20, label: "Giảm 20%" },
  WELCOME: { type: "percent", value: 15, label: "Giảm 15%" },
  VIP50K: { type: "fixed", value: 50000, label: "Giảm 50.000đ" },
};

function parsePriceToNumber(priceStr) {
  if (typeof priceStr === "number") return priceStr;
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function generateRandomKey(prefix = "GS") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = (len) =>
    Array.from({ length: len }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  return `${prefix}-${segment(4)}-${segment(5)}-${segment(4)}`;
}

function generateOrderId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  return `ORD-${rand}`;
}

export default function PurchaseModal({ product, isOpen, onClose }) {
  const navigate = useNavigate();
  const { balance, setBalance } = useBalance();
  const { user } = useAuth();

  const [selectedPkgIndex, setSelectedPkgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [loading, setLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Reset state when opening a new product
  useEffect(() => {
    if (isOpen) {
      setSelectedPkgIndex(0);
      setQuantity(1);
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError("");
      setPurchaseSuccess(null);
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  // Xử lý danh sách gói (từ CSDL `packages` hoặc fallback theo giá sản phẩm)
  const rawPackages = Array.isArray(product.packages) && product.packages.length > 0 ? product.packages : null;
  const defaultPackageList = rawPackages || [
    {
      id: "pkg-default",
      name: product.name,
      price: product.price,
      stock: product.stock ?? 0,
    },
  ];

  const currentPkg = defaultPackageList[selectedPkgIndex] || defaultPackageList[0];
  const unitPrice = parsePriceToNumber(currentPkg.price);
  const stockCount = currentPkg.stock ?? product.stock ?? 0;
  const soldCount = product.sold ?? 0;
  const maxStock = stockCount > 0 ? stockCount : 1;
  const isOutOfStock = product.status === "out" || stockCount === 0;

  // Tính toán tiền
  const subtotal = unitPrice * quantity;
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      discountAmount = Math.round((subtotal * appliedCoupon.value) / 100);
    } else if (appliedCoupon.type === "fixed") {
      discountAmount = appliedCoupon.value;
    }
  }
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const remainingBalance = balance - totalAmount;
  const isBalanceSufficient = remainingBalance >= 0;

  // Lấy ảnh & tính năng từ CSDL
  const imageUrl = product.image_url || product.image || "";
  const featuresList = Array.isArray(product.features) ? product.features : [];
  const descriptionText = product.desc || product.description || "";

  // Xử lý mã giảm giá
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Vui lòng nhập mã.");
      return;
    }
    if (DISCOUNT_CODES[code]) {
      setAppliedCoupon({ code, ...DISCOUNT_CODES[code] });
      setCouponError("");
    } else {
      setCouponError("Mã không hợp lệ hoặc đã hết hạn.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  // Kiểm tra xem sản phẩm có phải dạng Token không
  const isTokenProduct =
    product.productType === "token" ||
    product.product_type === "token" ||
    (product.name || "").toLowerCase().includes("token") ||
    (product.category_key || "").toLowerCase().includes("token") ||
    (product.category || "").toLowerCase().includes("token") ||
    (product.categoryLabel || "").toLowerCase().includes("token");

  // Xử lý xác nhận thanh toán
  const handleConfirmPurchase = async () => {
    if (!user) {
      onClose();
      navigate("/login");
      return;
    }

    if (!isBalanceSufficient) return;

    setLoading(true);
    try {
      const orderId = generateOrderId();
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")} ${now.getDate()}/${
        now.getMonth() + 1
      }/${now.getFullYear()}`;

      // 1. Lấy key từ bảng product_keys trong CSDL theo sản phẩm và gói đã chọn
      let claimedKeys = [];
      try {
        claimedKeys = await claimProductKeys({
          productId: product.id,
          productName: product.name,
          packageId: currentPkg.id || null,
          packageName: currentPkg.name,
          userId: user.id,
          orderId: orderId,
          quantity: quantity,
        });
      } catch (err) {
        console.warn("Không thể claim key từ bảng product_keys:", err);
      }

      // Nếu số key có sẵn trong CSDL ít hơn số lượng đặt mua, tự sinh key ngẫu nhiên bù vào
      const finalKeys = Array.isArray(claimedKeys) ? [...claimedKeys] : [];
      while (finalKeys.length < quantity) {
        finalKeys.push(generateRandomKey(isTokenProduct ? "TKN" : "GS"));
      }
      const productKeyString = finalKeys.join("\n");

      // 2. Trừ số dư
      const newBalance = remainingBalance;
      await setBalance(newBalance);

      // 3. Tạo đơn hàng trên Supabase
      const newOrder = {
        id: orderId,
        user_id: user.id,
        product_name: product.name,
        package_name: `${currentPkg.name}${quantity > 1 ? ` (x${quantity})` : ""}${
          appliedCoupon ? ` [Mã: ${appliedCoupon.code}]` : ""
        }`,
        product_type: isTokenProduct ? "token" : "key",
        status: "success",
        amount: totalAmount,
        purchased_at: timeStr,
        completed_at: timeStr,
        admin_note: isTokenProduct
          ? "Đã giao danh sách token thành công."
          : "Kích hoạt thành công. Vui lòng kiểm tra key và hướng dẫn sử dụng.",
        product_key: productKeyString,
        expires_in_seconds: 86400 * 365,
        supports_hwid_reset: !isTokenProduct,
      };
      await createOrder(newOrder);

      // 4. Tạo lịch sử giao dịch trên Supabase
      const newTx = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        user_id: user.id,
        type: "purchase",
        title: product.name,
        subtitle: `${currentPkg.name} • x${quantity}`,
        time: timeStr,
        amount: -totalAmount,
        balance_after: newBalance,
      };
      await createTransaction(newTx);

      // Thành công
      setPurchaseSuccess({
        orderId,
        productKey: productKeyString,
        totalAmount,
      });
    } catch (err) {
      console.error("Lỗi khi mua hàng:", err);
      alert("Đã có lỗi xảy ra khi xử lý đơn hàng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = async () => {
    if (purchaseSuccess?.productKey) {
      await navigator.clipboard.writeText(purchaseSuccess.productKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(8px)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#0E1017",
          border: "1px solid #1C202F",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          color: "#E8EAF0",
          fontFamily: "inherit",
        }}
      >
        {/* TOP HEADER */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #1C202F",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#11141E",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span
              style={{
                border: "1px solid rgba(117, 107, 255, 0.5)",
                background: "rgba(117, 107, 255, 0.12)",
                color: "#9D95FF",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "6px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {product.categoryLabel || "SẢN PHẨM"}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: "15.5px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {product.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#8B95A8",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 150ms ease, background 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FFFFFF";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#8B95A8";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div style={{ padding: "24px" }}>
          {purchaseSuccess ? (
            /* SUCCESS VIEW */
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#22C55E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle size={38} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#FFFFFF" }}>
                Thanh toán thành công!
              </h3>
              <p style={{ margin: "0 0 24px", fontSize: "13.5px", color: "#8B95A8" }}>
                Mã đơn hàng: <b style={{ color: "#FFFFFF" }}>{purchaseSuccess.orderId}</b> • Đã trừ:{" "}
                <b style={{ color: "#6C7BFF" }}>{formatVND(purchaseSuccess.totalAmount)}</b>
              </p>

              <div
                style={{
                  maxWidth: "500px",
                  margin: "0 auto 24px",
                  background: "#08090E",
                  border: "1px solid #1C202F",
                  borderRadius: "14px",
                  padding: "18px",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#8B95A8", marginBottom: "8px" }}>
                  {isTokenProduct ? "DANH SÁCH TOKEN CỦA BẠN:" : "MÃ KEY BẢN QUYỀN CỦA BẠN:"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    background: "#131622",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px dashed rgba(117, 107, 255, 0.5)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#6C7BFF",
                      letterSpacing: "0.04em",
                      whiteSpace: "pre-line",
                      lineHeight: 1.5,
                      maxHeight: "150px",
                      overflowY: "auto",
                    }}
                  >
                    {purchaseSuccess.productKey}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      border: "1px solid #2B3145",
                      background: copiedKey ? "rgba(34, 197, 94, 0.2)" : "#1C2030",
                      color: copiedKey ? "#22C55E" : "#FFFFFF",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                    {copiedKey ? "Đã chép" : isTokenProduct ? "Copy Token" : "Copy Key"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center", maxWidth: "420px", margin: "0 auto" }}>
                <button
                  onClick={() => {
                    onClose();
                    navigate("/don-hang");
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "12px 0",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Xem đơn hàng <ExternalLink size={15} />
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "10px",
                    border: "1px solid #2B3145",
                    background: "transparent",
                    color: "#8B95A8",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            /* 2-COLUMN PURCHASING VIEW */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr",
                gap: "28px",
              }}
              className="purchase-modal-grid"
            >
              {/* LEFT COLUMN: HÌNH ẢNH SẢN PHẨM + MÔ TẢ & TÍNH NĂNG TỪ DATABASE */}
              <div>
                {/* Product Image from Database */}
                <div
                  style={{
                    width: "100%",
                    height: "230px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "1px solid #242B3E",
                    background: "#11141E",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        color: "#6A758E",
                        padding: "20px",
                        textAlign: "center",
                      }}
                    >
                      <ImageIcon size={38} style={{ color: "#3E4860" }} />
                      <span style={{ fontSize: "12px" }}>
                        Hình ảnh sản phẩm (Thêm link ảnh vào cột <b>image_url</b> trên Supabase)
                      </span>
                    </div>
                  )}
                </div>

                {/* MÔ TẢ SẢN PHẨM (LẤY TỰ ĐỘNG TỪ CSDL) */}
                <div>
                  <h4
                    style={{
                      margin: "0 0 12px",
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#FFFFFF",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    MÔ TẢ SẢN PHẨM
                  </h4>

                  {/* Đoạn mô tả text nếu có trong CSDL */}
                  {descriptionText && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9DA7B8",
                        lineHeight: 1.6,
                        margin: "0 0 12px",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {descriptionText}
                    </p>
                  )}

                  {/* Danh sách tính năng (features array) từ CSDL */}
                  {featuresList.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {featuresList.map((feature, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            fontSize: "12.5px",
                            color: "#9DA7B8",
                            lineHeight: 1.4,
                          }}
                        >
                          <Check
                            size={14}
                            style={{
                              color: "#818CF8",
                              flexShrink: 0,
                              marginTop: "2px",
                            }}
                          />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  ) : !descriptionText ? (
                    <div style={{ fontSize: "12px", color: "#6A758E", fontStyle: "italic" }}>
                      Chưa có nội dung mô tả trong cơ sở dữ liệu.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* RIGHT COLUMN: TÍNH TOÁN, CHỌN GÓI, MÃ GIẢM GIÁ, CHÍNH SÁCH */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Status + Price Header */}
                <div>
                  <div style={{ marginBottom: "8px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: isOutOfStock ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                        color: isOutOfStock ? "#EF4444" : "#22C55E",
                        border: `1px solid ${isOutOfStock ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                      }}
                    >
                      ● {isOutOfStock ? "HẾT HÀNG" : "CÒN HÀNG"}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: 800,
                      color: "#5B7BFE",
                      letterSpacing: "-0.01em",
                      marginBottom: "4px",
                    }}
                  >
                    {formatVND(unitPrice)}
                  </div>

                  <div style={{ fontSize: "12px", color: "#8B95A8", display: "flex", gap: "14px" }}>
                    <span>
                      Kho: <b style={{ color: "#FFFFFF" }}>{stockCount}</b>
                    </span>
                    <span>
                      Đã bán: <b style={{ color: "#FFFFFF" }}>{soldCount}</b>
                    </span>
                  </div>
                </div>

                {/* Chọn gói (DANH SÁCH GÓI HOÀN CHỈNH) */}
                <div>
                  <div style={{ fontSize: "12px", color: "#8B95A8", marginBottom: "8px" }}>
                    Chọn gói ({defaultPackageList.length} lựa chọn)
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: defaultPackageList.length > 3 ? "195px" : "none",
                      overflowY: defaultPackageList.length > 3 ? "auto" : "visible",
                      paddingRight: defaultPackageList.length > 3 ? "4px" : "0px",
                    }}
                    className="custom-package-scrollbar"
                  >
                    {defaultPackageList.map((pkg, idx) => {
                      const isSelected = idx === selectedPkgIndex;
                      const pkgPrice = parsePriceToNumber(pkg.price);
                      const pkgStock = pkg.stock ?? 0;

                      return (
                        <div
                          key={pkg.id || idx}
                          onClick={() => setSelectedPkgIndex(idx)}
                          style={{
                            background: isSelected ? "rgba(91, 123, 254, 0.12)" : "#141724",
                            border: `1px solid ${
                              isSelected ? "rgba(91, 123, 254, 0.85)" : "#202638"
                            }`,
                            borderRadius: "10px",
                            padding: "11px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            transition: "all 150ms ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.borderColor = "#364160";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.borderColor = "#202638";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                border: `2px solid ${isSelected ? "#5B7BFE" : "#4A5568"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: isSelected ? "#5B7BFE" : "transparent",
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <div
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: "#FFFFFF",
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 800,
                                  color: isSelected ? "#FFFFFF" : "#E2E8F0",
                                }}
                              >
                                {pkg.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: pkgStock > 0 ? "#8B95A8" : "#EF4444",
                                  marginTop: "2px",
                                }}
                              >
                                {pkgStock > 0 ? `Còn ${pkgStock} key` : "Hết key trong kho"}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 800,
                              color: isSelected ? "#5B7BFE" : "#9CA3AF",
                              flexShrink: 0,
                            }}
                          >
                            {formatVND(pkgPrice)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Số lượng mua */}
                <div>
                  <div style={{ fontSize: "12px", color: "#8B95A8", marginBottom: "6px" }}>
                    Số lượng mua
                  </div>
                  <div
                    style={{
                      background: "#141724",
                      border: "1px solid #202638",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        disabled={quantity <= 1 || isOutOfStock}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          background: "#0B0D14",
                          border: "1px solid #242B3E",
                          color: quantity <= 1 ? "#4A5060" : "#FFFFFF",
                          cursor: quantity <= 1 ? "not-allowed" : "pointer",
                          fontWeight: 800,
                          fontSize: "15px",
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={maxStock}
                        value={quantity}
                        disabled={isOutOfStock}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQuantity(Math.max(1, Math.min(maxStock, val)));
                        }}
                        className="quantity-input"
                        style={{
                          width: "50px",
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: "14px",
                          background: "#0B0D14",
                          border: "1px solid #242B3E",
                          borderRadius: "6px",
                          color: "#FFFFFF",
                          padding: "6px 4px",
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        disabled={quantity >= maxStock || isOutOfStock}
                        onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          background: "#0B0D14",
                          border: "1px solid #242B3E",
                          color: quantity >= maxStock ? "#4A5060" : "#FFFFFF",
                          cursor: quantity >= maxStock ? "not-allowed" : "pointer",
                          fontWeight: 800,
                          fontSize: "15px",
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ fontSize: "12px", color: "#8B95A8" }}>
                      Kho khả dụng <b style={{ color: "#5B7BFE" }}>{stockCount} key</b>
                    </div>
                  </div>
                </div>

                {/* Mã giảm giá */}
                <div>
                  <div style={{ fontSize: "12px", color: "#8B95A8", marginBottom: "6px" }}>
                    Mã giảm giá
                  </div>
                  {appliedCoupon ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(34, 197, 94, 0.1)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: "10px",
                        padding: "8px 12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Tag size={14} style={{ color: "#22C55E" }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#22C55E" }}>
                          {appliedCoupon.code} ({appliedCoupon.label})
                        </span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#EF4444",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Gỡ bỏ
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: "6px" }}>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#141724",
                          border: "1px solid #202638",
                          borderRadius: "10px",
                          padding: "0 12px",
                        }}
                      >
                        <Tag size={14} style={{ color: "#6A758E" }} />
                        <input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Nhập mã..."
                          style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "#FFFFFF",
                            fontSize: "12.5px",
                            padding: "9px 0",
                          }}
                        />
                      </div>
                      <button
                        type="submit"
                        style={{
                          padding: "9px 18px",
                          borderRadius: "10px",
                          border: "none",
                          background: "#2D3452",
                          color: "#A2B0D6",
                          fontWeight: 700,
                          fontSize: "12.5px",
                          cursor: "pointer",
                          transition: "background 150ms ease, color 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#3E4870";
                          e.currentTarget.style.color = "#FFFFFF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#2D3452";
                          e.currentTarget.style.color = "#A2B0D6";
                        }}
                      >
                        Áp dụng
                      </button>
                    </form>
                  )}
                  {couponError && (
                    <div style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px" }}>
                      {couponError}
                    </div>
                  )}
                </div>

                {/* BẢNG TÍNH TIỀN CHI TIẾT */}
                <div
                  style={{
                    background: "#141724",
                    border: "1px solid #202638",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  {/* Gói đang chọn */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8B95A8" }}>Gói đã chọn:</span>
                    <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{currentPkg.name}</span>
                  </div>

                  {/* Đơn giá */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8B95A8" }}>Đơn giá:</span>
                    <span style={{ color: "#5B7BFE", fontWeight: 700 }}>{formatVND(unitPrice)}</span>
                  </div>

                  {/* Số lượng */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8B95A8" }}>Số lượng:</span>
                    <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{quantity}</span>
                  </div>

                  {/* Giảm giá nếu có */}
                  {appliedCoupon && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#22C55E" }}>
                      <span>Giảm giá ({appliedCoupon.code}):</span>
                      <span style={{ fontWeight: 700 }}>-{formatVND(discountAmount)}</span>
                    </div>
                  )}

                  {/* Thành tiền */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8B95A8" }}>Thành tiền:</span>
                    <span style={{ color: "#5B7BFE", fontWeight: 800 }}>{formatVND(totalAmount)}</span>
                  </div>

                  {/* Số dư */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8B95A8" }}>Số dư:</span>
                    <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{formatVND(balance)}</span>
                  </div>

                  {/* Còn lại */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#8B95A8" }}>Còn lại:</span>
                    <span
                      style={{
                        color: isBalanceSufficient ? "#22C55E" : "#FF4D5A",
                        fontWeight: 800,
                      }}
                    >
                      {formatVND(remainingBalance)}
                    </span>
                  </div>
                </div>

                {/* NÚT XÁC NHẬN MUA */}
                <button
                  type="button"
                  disabled={!isBalanceSufficient || isOutOfStock || loading}
                  onClick={handleConfirmPurchase}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "13px 0",
                    borderRadius: "10px",
                    border: "none",
                    background:
                      !isBalanceSufficient || isOutOfStock
                        ? "#2D3452"
                        : "linear-gradient(135deg, #6366F1, #4F46E5)",
                    color: !isBalanceSufficient || isOutOfStock ? "#6A758E" : "#FFFFFF",
                    fontSize: "14.5px",
                    fontWeight: 700,
                    cursor: !isBalanceSufficient || isOutOfStock || loading ? "not-allowed" : "pointer",
                    transition: "filter 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (isBalanceSufficient && !isOutOfStock) e.currentTarget.style.filter = "brightness(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    if (isBalanceSufficient && !isOutOfStock) e.currentTarget.style.filter = "brightness(1)";
                  }}
                >
                  <ShoppingCart size={17} />
                  {loading ? "Đang xử lý..." : "Xác nhận mua"}
                </button>

                {/* Cảnh báo nếu số dư không đủ */}
                {!isBalanceSufficient && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      background: "rgba(245, 185, 66, 0.08)",
                      border: "1px solid rgba(245, 185, 66, 0.25)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      color: "#F5B942",
                    }}
                  >
                    <span>Số dư không đủ để thanh toán.</span>
                    <button
                      onClick={() => {
                        onClose();
                        navigate("/nap-tien");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#5B7BFE",
                        fontWeight: 700,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Nạp tiền ngay
                    </button>
                  </div>
                )}

                {/* CHÍNH SÁCH MUA HÀNG BOX */}
                <div
                  style={{
                    background: "#141724",
                    border: "1px solid #202638",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    fontSize: "12px",
                    color: "#8B95A8",
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#EAB308",
                      letterSpacing: "0.04em",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                    }}
                  >
                    CHÍNH SÁCH MUA HÀNG
                  </div>
                  <div>
                    ✓ Key được giao <b style={{ color: "#FFFFFF" }}>tự động ngay</b> sau khi thanh toán.
                  </div>
                  <div>
                    ✓ Sản phẩm đã mua <b style={{ color: "#FFFFFF" }}>không hoàn tiền</b> trong mọi trường hợp.
                  </div>
                  <div>
                    ✓ Có vấn đề? Liên hệ{" "}
                    <span
                      onClick={() => {
                        onClose();
                        navigate("/lien-he");
                      }}
                      style={{ color: "#5B7BFE", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Hỗ Trợ
                    </span>{" "}
                    ngay.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .quantity-input::-webkit-inner-spin-button,
        .quantity-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .quantity-input[type=number] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .custom-package-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-package-scrollbar::-webkit-scrollbar-track {
          background: #0E1017;
          border-radius: 4px;
        }
        .custom-package-scrollbar::-webkit-scrollbar-thumb {
          background: #242B3E;
          border-radius: 4px;
        }
        .custom-package-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3A4562;
        }
        @media (max-width: 800px) {
          .purchase-modal-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
