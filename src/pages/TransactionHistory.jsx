import React, { useEffect, useMemo, useState } from "react";
import { History, ArrowDownCircle, ArrowUpCircle, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "../theme";
import { useBalance } from "../context/BalanceContext";
import { useAuth } from "../context/AuthContext";
import { fetchTransactions } from "../api";

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "topup", label: "Nạp tiền" },
  { key: "purchase", label: "Mua hàng" },
  { key: "refund", label: "Hoàn tiền" },
];

const PAGE_SIZE = 4;

const ICON_MAP = {
  purchase: { icon: ArrowUpCircle, color: COLORS.danger },
  topup: { icon: ArrowDownCircle, color: COLORS.success },
  refund: { icon: RotateCcw, color: COLORS.success },
};

function TxRow({ tx }) {
  const meta = ICON_MAP[tx.type] || { icon: ArrowDownCircle, color: COLORS.accent };
  const Icon = meta.icon;
  const isPositive = tx.amount > 0;

  return (
    <button
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "14px",
        padding: "14px 16px",
        marginBottom: "10px",
        cursor: "pointer",
        transition: "border-color 180ms ease, transform 180ms ease",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = COLORS.accent;
        e.currentTarget.style.transform = "translateX(2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = COLORS.border;
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: `${meta.color}1A`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} style={{ color: meta.color }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13.5px", fontWeight: 700, color: COLORS.textMain, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tx.title}
          </div>
          <div style={{ fontSize: "11.5px", color: COLORS.textSub, marginTop: "2px" }}>{tx.subtitle}</div>
          <div style={{ fontSize: "11px", color: COLORS.textSub, marginTop: "2px", opacity: 0.7 }}>{tx.time}</div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: isPositive ? COLORS.success : COLORS.danger }}>
          {isPositive ? "+" : ""}
          {tx.amount.toLocaleString("vi-VN")}đ
        </div>
        <div style={{ fontSize: "11px", color: COLORS.textSub, marginTop: "2px" }}>Dư: {tx.balanceAfter.toLocaleString("vi-VN")}đ</div>
      </div>
    </button>
  );
}

export default function TransactionHistory() {
  const { formatted } = useBalance();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    fetchTransactions(user.id)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    return filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
  }, [filter, transactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: COLORS.textMain, display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={20} style={{ color: COLORS.accent }} />
          Lịch sử giao dịch
        </h1>
        <div style={{ fontSize: "13px", color: COLORS.textSub }}>
          Số dư hiện tại: <b style={{ color: COLORS.textMain }}>{formatted}</b>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              style={{
                padding: "7px 14px",
                borderRadius: "999px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                background: isActive ? COLORS.accent : "transparent",
                color: isActive ? "#fff" : COLORS.textSub,
                transition: "all 180ms ease",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ color: COLORS.textSub, fontSize: "13px", padding: "40px 0", textAlign: "center" }}>Đang tải giao dịch...</div>
      ) : paged.length === 0 ? (
        <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: "14px", padding: "40px", textAlign: "center", color: COLORS.textSub, fontSize: "13px" }}>
          Không có giao dịch nào.
        </div>
      ) : (
        paged.map((tx) => <TxRow key={tx.id} tx={tx} />)
      )}

      {filtered.length > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "18px" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={pagerBtnStyle(page === 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: "12.5px", color: COLORS.textSub }}>
            Trang <b style={{ color: COLORS.textMain }}>{page}</b> / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={pagerBtnStyle(page === totalPages)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function pagerBtnStyle(disabled) {
  return {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: disabled ? "#4A5060" : COLORS.textMain,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
