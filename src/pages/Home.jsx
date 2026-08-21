import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { COLORS } from "../theme";
import { fetchProducts } from "../api";
import FeedbackCarousel from "../components/FeedbackCarousel";
import HeroBanner from "../components/HeroBanner";
import CategoryTabs from "../components/CategoryTabs";
import ProductGrid from "../components/ProductGrid";
import PurchaseModal from "../components/PurchaseModal";

export default function Home() {
  const { search } = useOutletContext();
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const reloadProducts = () => {
    fetchProducts().then(setProducts).catch(console.error);
  };

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchesCategory =
      activeCategory === "all" ||
      p.category_key === activeCategory ||
      p.category === activeCategory;
    const matchesSearch = (p.name || "")
      .toLowerCase()
      .includes((search || "").trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      <HeroBanner />

      <FeedbackCarousel />

      <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 16px", color: COLORS.textMain }}>
        Danh mục sản phẩm
      </h2>

      <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />

      {loading ? (
        <div style={{ color: COLORS.textSub, fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
          Đang tải sản phẩm...
        </div>
      ) : (
        <ProductGrid products={filtered} onBuy={(product) => setSelectedProduct(product)} />
      )}

      {selectedProduct && (
        <PurchaseModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            reloadProducts();
          }}
        />
      )}
    </div>
  );
}
