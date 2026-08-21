import React from "react";
import { COLORS } from "../theme";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products, onBuy }) {
  if (products.length === 0) {
    return (
      <div
        style={{
          border: `1px dashed ${COLORS.border}`,
          borderRadius: "16px",
          padding: "50px 20px",
          textAlign: "center",
          color: COLORS.textSub,
          fontSize: "13.5px",
        }}
      >
        Không tìm thấy sản phẩm phù hợp.
      </div>
    );
  }
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onBuy={onBuy} />
      ))}
    </div>
  );
}
