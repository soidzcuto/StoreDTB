import React, { useEffect, useState } from "react";
import { COLORS } from "../theme";
import { fetchCategories } from "../api";

export default function CategoryTabs({ active, onSelect }) {
  const [categories, setCategories] = useState([{ key: "all", label: "Tất cả" }]);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(console.error);
  }, []);

  return (
    <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "18px" }}>
      {categories.map((c) => {
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
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
  );
}
