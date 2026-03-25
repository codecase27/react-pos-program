import React, { useState } from "react";

const fmt = (n) => "₭" + Number(n || 0).toLocaleString("en-US");

export default function StoreFront({ products, categories, storeSettings, onPlaceOrder, isWholesale }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredProducts = products.filter((p) =>
    (catFilter === "All" || p.category === catFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    if (product.stock <= 0) return notify("Out of stock!");
    const displayPrice = isWholesale ? (product.wholesalePrice || product.price) : product.price;
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) {
        if (ex.qty >= product.stock) { notify("Not enough stock!"); return prev; }
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      notify(`Added ${product.name} to cart`);
      return [...prev, { ...product, price: displayPrice, qty: 1 }];
    });
  };

  const updateQty = (id, qty) => {
    setCart((prev) => qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => i.id === id ? { ...i, qty } : i));
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleCheckout = () => {
    if (!customerName.trim()) return notify("Please enter your name");
    if (cart.length === 0) return notify("Cart is empty");
    onPlaceOrder(cart, { name: customerName + (isWholesale ? " (Wholesale)" : "") });
    setCart([]);
    setShowCart(false);
    setCustomerName("");
    notify("Order placed successfully! Please pay at the counter.");
  };

  const S = {
    font: "'Nunito Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
    bg: "#f9fafb",
    card: { background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb" },
    input: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", fontFamily: "'Nunito Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" },
    btn: (bg = "#111827", color = "#fff") => ({ background: bg, color, border: "none", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "'Nunito Sans', sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }),
  };

  return (
    <div style={{ fontFamily: S.font, background: S.bg, minHeight: "100vh", color: "#111827", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
      `}</style>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, padding: "12px 22px", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "13px", zIndex: 9999, background: "#059669", boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: "20px" }}>{storeSettings?.name || "Store"} {isWholesale && <span style={{ color: "#7c3aed" }}>Wholesale</span>}</h1>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={() => { window.location.hash = "#login"; }} style={{ ...S.btn("transparent", "#6b7280"), padding: "6px" }}>
            🔐 Login
          </button>
          <button onClick={() => setShowCart(true)} style={{ ...S.btn("#f3f4f6", "#111827"), position: "relative" }}>
            🛒 Cart
            {cart.length > 0 && (
              <span style={{ position: "absolute", top: "-8px", right: "-8px", background: "#dc2626", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                {cart.reduce((s, c) => s + c.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", flex: 1, width: "100%", boxSizing: "border-box" }}>
        
        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...S.input, maxWidth: "300px" }} />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", overflowX: "auto" }}>
            {["All", ...(categories || [])].map((c) => (
              <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "8px 16px", borderRadius: "20px", border: catFilter === c ? "2px solid #111827" : "1px solid #e5e7eb", background: catFilter === c ? "#111827" : "#fff", color: catFilter === c ? "#fff" : "#6b7280", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
          {filteredProducts.map((p) => {
            const outOfStock = p.stock <= 0;
            return (
              <div key={p.id} style={{ ...S.card, padding: "16px", display: "flex", flexDirection: "column", opacity: outOfStock ? 0.6 : 1 }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", marginBottom: "12px" }} />
                ) : (
                  <div style={{ width: "100%", height: "140px", background: "#f3f4f6", borderRadius: "8px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>🛍️</div>
                )}
                <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "4px" }}>{p.name}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", flex: 1 }}>{p.category}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                  <div style={{ fontFamily: S.mono, fontWeight: 900, fontSize: "16px", color: isWholesale ? "#7c3aed" : "#059669" }}>
                    {fmt(isWholesale ? (p.wholesalePrice || p.price) : p.price)}
                  </div>
                  <button onClick={() => addToCart(p)} disabled={outOfStock} style={{ ...S.btn(outOfStock ? "#e5e7eb" : "#111827", outOfStock ? "#9ca3af" : "#fff"), padding: "6px 12px" }}>
                    {outOfStock ? "Sold Out" : "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", justifyContent: "flex-end" }} onClick={() => setShowCart(false)}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "400px", height: "100%", display: "flex", flexDirection: "column", animation: "slideRight 0.2s ease" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontWeight: 900 }}>Your Cart</h2>
              <button onClick={() => setShowCart(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: "40px" }}>Cart is empty</div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: "12px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #f3f4f6" }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
                    ) : (
                      <div style={{ width: "60px", height: "60px", background: "#f3f4f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>🛍️</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "4px" }}>{item.name}</div>
                      <div style={{ color: "#059669", fontFamily: S.mono, fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>{fmt(item.price)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: "28px", height: "28px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#fff", cursor: "pointer", fontWeight: 800 }}>−</button>
                        <span style={{ fontFamily: S.mono, fontWeight: 700 }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: "28px", height: "28px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#fff", cursor: "pointer", fontWeight: 800 }}>+</button>
                      </div>
                    </div>
                    <div style={{ fontFamily: S.mono, fontWeight: 800, fontSize: "14px" }}>
                      {fmt(item.price * item.qty)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: "20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "18px", fontWeight: 900 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: S.mono, color: "#059669" }}>{fmt(total)}</span>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginBottom: "6px", textTransform: "uppercase" }}>Your Name *</div>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your name for the order" style={S.input} />
                </div>
                <button onClick={handleCheckout} style={{ ...S.btn("#059669"), width: "100%", padding: "14px", fontSize: "16px" }}>
                  Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}