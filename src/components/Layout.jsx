import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { COLORS } from "../theme";
import Sidebar from "./Sidebar";
import Header from "./Header";
import FloatingSupport from "./FloatingSupport";

export default function Layout() {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", color: COLORS.textMain }}>
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Header onOpenMobile={() => setMobileOpen(true)} search={search} setSearch={setSearch} />

        <main style={{ padding: "24px", flex: 1 }}>
          <Outlet context={{ search }} />
        </main>
      </div>

      <FloatingSupport />
    </div>
  );
}
