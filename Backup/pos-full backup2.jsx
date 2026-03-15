import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

// ─── UTILS ───
const ID = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n) => "₭" + Number(n || 0).toLocaleString("en-US");
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const fmtFull = (d) => `${fmtDate(d)} ${fmtTime(d)}`;
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0") + "%";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ─── DEFAULT DATA ───
const DEFAULT_CATS = ["Drinks", "Food", "Snacks", "Other"];
const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Lao Coffee", sku: "DRK-001", cost: 8000, price: 15000, wholesalePrice: 12000, category: "Drinks", stock: 100, lowStockThreshold: 10, unit: "cup", barcode: "8850001" },
  { id: "p2", name: "Green Tea", sku: "DRK-002", cost: 5000, price: 10000, wholesalePrice: 8000, category: "Drinks", stock: 80, lowStockThreshold: 10, unit: "cup", barcode: "8850002" },
  { id: "p3", name: "Baguette Sandwich", sku: "FOD-001", cost: 12000, price: 25000, wholesalePrice: 20000, category: "Food", stock: 30, lowStockThreshold: 5, unit: "pc", barcode: "8850003" },
  { id: "p4", name: "Khao Piak Sen", sku: "FOD-002", cost: 15000, price: 30000, wholesalePrice: 24000, category: "Food", stock: 25, lowStockThreshold: 5, unit: "bowl", barcode: "8850004" },
  { id: "p5", name: "Sticky Rice", sku: "FOD-003", cost: 3000, price: 5000, wholesalePrice: 4000, category: "Food", stock: 50, lowStockThreshold: 10, unit: "portion", barcode: "8850005" },
  { id: "p6", name: "Fresh Juice", sku: "DRK-003", cost: 7000, price: 15000, wholesalePrice: 12000, category: "Drinks", stock: 40, lowStockThreshold: 8, unit: "glass", barcode: "8850006" },
  { id: "p7", name: "Water Bottle", sku: "DRK-004", cost: 2000, price: 5000, wholesalePrice: 3500, category: "Drinks", stock: 200, lowStockThreshold: 20, unit: "bottle", barcode: "8850007" },
  { id: "p8", name: "Lao Chips", sku: "SNK-001", cost: 4000, price: 8000, wholesalePrice: 6500, category: "Snacks", stock: 60, lowStockThreshold: 10, unit: "bag", barcode: "8850008" },
];

const TAX_RATE = 0; // Set to e.g. 0.10 for 10% tax

// ─── STORAGE HELPERS ───
const loadData = async (key, fallback) => {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
};
const saveData = async (key, val) => {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
};

// ─── ICONS (inline SVG components) ───
const Icon = ({ d, size = 18, color = "currentColor", ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{typeof d === "string" ? <path d={d} /> : d}</svg>
);
const Icons = {
  pos: <Icon d={<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>} />,
  history: <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  products: <Icon d={<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></>} />,
  customers: <Icon d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>} />,
  dashboard: <Icon d={<><path d="M18 20V10M12 20V4M6 20v-6"/></>} />,
  settings: <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>} />,
  search: <Icon d={<><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>} />,
  plus: <Icon d="M12 5v14M5 12h14" />,
  minus: <Icon d="M5 12h14" />,
  trash: <Icon d={<><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>} />,
  download: <Icon d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></>} />,
  receipt: <Icon d={<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 10h8M8 14h4"/></>} />,
  alert: <Icon d={<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></>} />,
  check: <Icon d="M20 6L9 17l-5-5" />,
  x: <Icon d="M18 6L6 18M6 6l12 12" />,
  edit: <Icon d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />,
  refund: <Icon d={<><path d="M3 10h10a5 5 0 010 10H9M3 10l4-4M3 10l4 4"/></>} />,
  tag: <Icon d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/></>} />,
  cart: <Icon d={<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></>} />,
  hold: <Icon d={<><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M12 8v8M8 12h8"/></>} />,
  star: <Icon d={<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>} />,
};

// ─── CATEGORY COLORS ───
const CAT_COLORS = {
  Drinks: { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8", light: "#eff6ff" },
  Food: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", light: "#fffbeb" },
  Snacks: { bg: "#fce7f3", border: "#ec4899", text: "#9d174d", light: "#fdf2f8" },
  Other: { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3", light: "#eef2ff" },
};
const getCatColor = (cat) => CAT_COLORS[cat] || CAT_COLORS.Other;

// ─── MAIN COMPONENT ───
export default function FullPOS() {
  // ── State ──
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [heldOrders, setHeldOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState("pos");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("today");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [priceMode, setPriceMode] = useState("retail");
  const [discount, setDiscount] = useState({ type: "none", value: 0 });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [showReceipt, setShowReceipt] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editSale, setEditSale] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    name: "My Store", phone: "", address: "", taxRate: 0, currency: "₭", receiptFooter: "Thank you for your visit!"
  });
  const [loaded, setLoaded] = useState(false);
  const barcodeRef = useRef(null);

  // ── Load/Save ──
  useEffect(() => {
    (async () => {
      const [p, s, c, h, st] = await Promise.all([
        loadData("pos2-products", DEFAULT_PRODUCTS),
        loadData("pos2-sales", []),
        loadData("pos2-customers", []),
        loadData("pos2-held", []),
        loadData("pos2-settings", storeSettings),
      ]);
      setProducts(p); setSales(s); setCustomers(c); setHeldOrders(h); setStoreSettings(st);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) saveData("pos2-products", products); }, [products, loaded]);
  useEffect(() => { if (loaded) saveData("pos2-sales", sales); }, [sales, loaded]);
  useEffect(() => { if (loaded) saveData("pos2-customers", customers); }, [customers, loaded]);
  useEffect(() => { if (loaded) saveData("pos2-held", heldOrders); }, [heldOrders, loaded]);
  useEffect(() => { if (loaded) saveData("pos2-settings", storeSettings); }, [storeSettings, loaded]);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Cart Logic ──
  const getActivePrice = (product) => priceMode === "wholesale" ? (product.wholesalePrice || product.price) : product.price;

  const addToCart = (product) => {
    if (product.stock <= 0) return notify("Out of stock!", "error");
    const activePrice = getActivePrice(product);
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) {
        if (ex.qty >= product.stock) { notify("Not enough stock!", "error"); return prev; }
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, price: activePrice, qty: 1, itemDiscount: 0 }];
    });
  };

  const switchPriceMode = (mode) => {
    setPriceMode(mode);
    setCart((prev) => prev.map((i) => {
      const product = products.find((p) => p.id === i.id);
      if (!product) return i;
      return { ...i, price: mode === "wholesale" ? (product.wholesalePrice || product.price) : product.price };
    }));
  };

  const updateCartQty = (id, qty) => {
    const product = products.find((p) => p.id === id);
    if (qty > (product?.stock || 999)) { notify("Not enough stock!", "error"); return; }
    setCart((prev) => qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => i.id === id ? { ...i, qty } : i));
  };

  const setItemDiscount = (id, disc) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, itemDiscount: disc } : i));
  };

  const removeFromCart = (id) => setCart((p) => p.filter((i) => i.id !== id));
  const clearCart = () => { setCart([]); setDiscount({ type: "none", value: 0 }); setSelectedCustomer(null); setCashReceived(""); };

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + (i.price - (i.itemDiscount || 0)) * i.qty, 0);
  const discountAmt = discount.type === "percent" ? subtotal * (discount.value / 100) : discount.type === "fixed" ? discount.value : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const taxAmt = afterDiscount * (storeSettings.taxRate / 100);
  const grandTotal = afterDiscount + taxAmt;
  const totalCost = cart.reduce((s, i) => s + i.cost * i.qty, 0);
  const totalProfit = grandTotal - totalCost;
  const changeAmt = Math.max(0, (Number(cashReceived) || 0) - grandTotal);

  // ── Hold / Recall ──
  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders((p) => [...p, { id: ID(), cart: [...cart], discount, customer: selectedCustomer, date: new Date().toISOString() }]);
    clearCart();
    notify("Order held");
  };

  const recallOrder = (heldId) => {
    const held = heldOrders.find((h) => h.id === heldId);
    if (!held) return;
    setCart(held.cart);
    setDiscount(held.discount || { type: "none", value: 0 });
    setSelectedCustomer(held.customer || null);
    setHeldOrders((p) => p.filter((h) => h.id !== heldId));
    notify("Order recalled");
  };

  // ── Complete Sale ──
  const completeSale = () => {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && (Number(cashReceived) || 0) < grandTotal) {
      notify("Insufficient cash received!", "error"); return;
    }
    const sale = {
      id: ID(), receiptNo: `RCP-${Date.now().toString().slice(-8)}`,
      date: new Date().toISOString(),
      items: cart.map((i) => ({
        id: i.id, name: i.name, sku: i.sku, qty: i.qty, cost: i.cost, price: i.price,
        itemDiscount: i.itemDiscount || 0,
        lineTotal: (i.price - (i.itemDiscount || 0)) * i.qty,
        lineCost: i.cost * i.qty,
        lineProfit: ((i.price - (i.itemDiscount || 0)) - i.cost) * i.qty,
      })),
      subtotal, discountAmt, discountInfo: { ...discount },
      taxRate: storeSettings.taxRate, taxAmt, grandTotal, totalCost, totalProfit,
      paymentMethod, cashReceived: paymentMethod === "cash" ? Number(cashReceived) : grandTotal,
      change: paymentMethod === "cash" ? changeAmt : 0,
      customerId: selectedCustomer?.id || null, customerName: selectedCustomer?.name || "Walk-in",
      status: "completed",
    };

    // Update stock
    setProducts((prev) => prev.map((p) => {
      const item = cart.find((c) => c.id === p.id);
      return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
    }));

    // Update customer spend
    if (selectedCustomer) {
      setCustomers((prev) => prev.map((c) => c.id === selectedCustomer.id
        ? { ...c, totalSpent: (c.totalSpent || 0) + grandTotal, visits: (c.visits || 0) + 1, lastVisit: new Date().toISOString(), loyaltyPoints: (c.loyaltyPoints || 0) + Math.floor(grandTotal / 1000) }
        : c
      ));
    }

    setSales((prev) => [sale, ...prev]);
    setShowReceipt(sale);
    clearCart();
    notify(`Sale ${sale.receiptNo} completed!`);
  };

  // ── Refund ──
  const refundSale = (saleId) => {
    setSales((prev) => prev.map((s) => {
      if (s.id !== saleId || s.status === "refunded") return s;
      // Restore stock
      s.items.forEach((item) => {
        setProducts((pp) => pp.map((p) => p.id === item.id ? { ...p, stock: p.stock + item.qty } : p));
      });
      return { ...s, status: "refunded", refundDate: new Date().toISOString() };
    }));
    notify("Sale refunded & stock restored");
  };

  // ── Edit / Delete Sale ──
  const recalcEditSale = (sale) => {
    const items = sale.items.map((i) => {
      const qty = Math.max(1, Number(i.qty) || 1);
      const lineTotal = (i.price - (i.itemDiscount || 0)) * qty;
      const lineCost = i.cost * qty;
      return { ...i, qty, lineTotal, lineCost, lineProfit: lineTotal - lineCost };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const di = sale.discountInfo || {};
    const discountAmt = di.type === "pct" ? subtotal * ((di.value || 0) / 100) : di.type === "fixed" ? (di.value || 0) : 0;
    const afterDiscount = Math.max(0, subtotal - discountAmt);
    const taxAmt = afterDiscount * (sale.taxRate || 0);
    const grandTotal = afterDiscount + taxAmt;
    const totalCost = items.reduce((s, i) => s + i.lineCost, 0);
    return { ...sale, items, subtotal, discountAmt, taxAmt, grandTotal, totalCost, totalProfit: grandTotal - totalCost };
  };
  const updateEditSaleQty = (index, qty) => {
    const items = editSale.items.map((item, i) => i === index ? { ...item, qty: Math.max(1, Number(qty) || 1) } : item);
    setEditSale(recalcEditSale({ ...editSale, items }));
  };
  const removeEditSaleItem = (index) => {
    if (editSale.items.length === 1) { notify("Sale must have at least one item", "error"); return; }
    const items = editSale.items.filter((_, i) => i !== index);
    setEditSale(recalcEditSale({ ...editSale, items }));
  };
  const saveEditedSale = () => {
    const updated = recalcEditSale(editSale);
    setSales((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s));
    setEditSale(null);
    notify("Sale updated");
  };
  const deleteSale = (saleId) => {
    if (!window.confirm("Delete this sale record permanently?")) return;
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    notify("Sale deleted");
  };

  // ── Barcode scan ──
  const handleProductImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext("2d");
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);
        setEditProduct((prev) => ({ ...prev, image: canvas.toDataURL("image/jpeg", 0.85) }));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleBarcodeScan = (code) => {
    const product = products.find((p) => p.barcode === code || p.sku === code);
    if (product) { addToCart(product); notify(`Added: ${product.name}`); }
    else notify("Product not found!", "error");
  };

  // ── Filter sales ──
  const filterSales = (list) => list.filter((s) => {
    const d = new Date(s.date), now = new Date();
    if (dateFilter === "today") return d.toDateString() === now.toDateString();
    if (dateFilter === "week") return d >= new Date(now - 7 * 864e5);
    if (dateFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const filtered = filterSales(sales);
  const completedSales = filtered.filter((s) => s.status === "completed");
  const refundedSales = filtered.filter((s) => s.status === "refunded");
  const totals = {
    revenue: completedSales.reduce((s, i) => s + i.grandTotal, 0),
    cost: completedSales.reduce((s, i) => s + i.totalCost, 0),
    profit: completedSales.reduce((s, i) => s + i.totalProfit, 0),
    tax: completedSales.reduce((s, i) => s + i.taxAmt, 0),
    discounts: completedSales.reduce((s, i) => s + i.discountAmt, 0),
    refunds: refundedSales.reduce((s, i) => s + i.grandTotal, 0),
    transactions: completedSales.length,
  };
  const netRevenue = totals.revenue - totals.refunds;

  // Low stock alerts
  const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold);

  // ── Export ──
  const exportToExcel = () => {
    if (filtered.length === 0) { notify("No data to export", "error"); return; }
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ──
    const summaryData = [
      [storeSettings.name + " — Sales Report"],
      ["Period", dateFilter === "all" ? "All Time" : dateFilter],
      ["Generated", fmtFull(new Date())],
      [],
      ["Metric", "Value"],
      ["Gross Revenue", totals.revenue],
      ["Total Cost", totals.cost],
      ["Gross Profit", totals.profit],
      ["Discounts Given", totals.discounts],
      ["Tax Collected", totals.tax],
      ["Refunds", totals.refunds],
      ["Net Revenue", netRevenue],
      ["Transactions", totals.transactions],
      ["Profit Margin", pct(totals.profit, totals.revenue)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    // ── Sheet 2: Transactions ──
    const txRows = [["Receipt #", "Date", "Time", "Customer", "Item", "SKU", "Qty", "Unit Cost", "Unit Price", "Discount", "Line Total", "Line Cost", "Line Profit", "Payment", "Status"]];
    filtered.forEach((sale) => sale.items.forEach((item) => {
      txRows.push([sale.receiptNo, fmtDate(sale.date), fmtTime(sale.date), sale.customerName, item.name, item.sku || "", item.qty, item.cost, item.price, item.itemDiscount || 0, item.lineTotal, item.lineCost, item.lineProfit, sale.paymentMethod, sale.status]);
    }));
    txRows.push([], ["", "", "", "", "", "", "", "", "TOTALS", "", totals.revenue, totals.cost, totals.profit]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txRows), "Transactions");

    // ── Sheet 3: Product Performance ──
    const perfMap = {};
    completedSales.forEach((s) => s.items.forEach((i) => {
      if (!perfMap[i.name]) perfMap[i.name] = { sku: i.sku, qty: 0, rev: 0, cost: 0, profit: 0 };
      perfMap[i.name].qty += i.qty; perfMap[i.name].rev += i.lineTotal;
      perfMap[i.name].cost += i.lineCost; perfMap[i.name].profit += i.lineProfit;
    }));
    const perfRows = [["Product", "SKU", "Qty Sold", "Revenue", "Cost", "Profit", "Margin %"]];
    Object.entries(perfMap).sort((a, b) => b[1].rev - a[1].rev).forEach(([n, d]) => {
      perfRows.push([n, d.sku, d.qty, d.rev, d.cost, d.profit, pct(d.profit, d.rev)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(perfRows), "Product Performance");

    // ── Sheet 4: Inventory ──
    const invRows = [["Product", "SKU", "Category", "Current Stock", "Unit", "Low Stock Threshold", "Status"]];
    products.forEach((p) => invRows.push([p.name, p.sku, p.category, p.stock, p.unit, p.lowStockThreshold, p.stock <= p.lowStockThreshold ? "LOW" : "OK"]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invRows), "Inventory");

    // ── Sheet 5: Customers ──
    const custRows = [["Name", "Phone", "Email", "Visits", "Total Spent", "Loyalty Points", "Last Visit"]];
    customers.forEach((c) => custRows.push([c.name, c.phone || "", c.email || "", c.visits || 0, c.totalSpent || 0, c.loyaltyPoints || 0, c.lastVisit ? fmtDate(c.lastVisit) : ""]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(custRows), "Customers");

    // ── Sheet 6: Payment Methods ──
    const pmMap = {};
    completedSales.forEach((s) => { pmMap[s.paymentMethod] = pmMap[s.paymentMethod] || { count: 0, amt: 0 }; pmMap[s.paymentMethod].count++; pmMap[s.paymentMethod].amt += s.grandTotal; });
    const pmRows = [["Method", "Transactions", "Total Amount"]];
    Object.entries(pmMap).forEach(([m, d]) => pmRows.push([m, d.count, d.amt]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pmRows), "Payment Methods");

    XLSX.writeFile(wb, `${storeSettings.name.replace(/\s/g, "_")}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify("Report exported as Excel!");
  };

  // ── Styles ──
  const S = {
    font: "'Nunito Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
    bg: "#f0f2f5",
    card: { background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb" },
    input: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", fontFamily: "'Nunito Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.15s" },
    btn: (bg = "#111827", color = "#fff") => ({ background: bg, color, border: "none", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "'Nunito Sans', sans-serif", transition: "all 0.12s", display: "inline-flex", alignItems: "center", gap: "6px" }),
    label: { fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", display: "block" },
  };

  // ── Sidebar Nav ──
  const navItems = [
    { id: "pos", label: "POS", icon: Icons.pos },
    { id: "history", label: "Sales", icon: Icons.history },
    { id: "products", label: "Products", icon: Icons.products },
    { id: "customers", label: "Customers", icon: Icons.customers },
    { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
    { id: "settings", label: "Settings", icon: Icons.settings },
  ];

  const filteredProducts = products.filter((p) =>
    (catFilter === "All" || p.category === catFilter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase()) || (p.barcode || "").includes(search))
  );

  // ── RENDER ──
  return (
    <div style={{ fontFamily: S.font, background: S.bg, minHeight: "100vh", display: "flex", color: "#111827" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
      <style>{`
        button:active{transform:scale(0.97)} input:focus{border-color:#111827!important;box-shadow:0 0 0 3px rgba(17,24,39,0.08)}
        select:focus{border-color:#111827!important;box-shadow:0 0 0 3px rgba(17,24,39,0.08)}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .fade-in{animation:fadeIn 0.25s ease} .slide-r{animation:slideRight 0.2s ease}
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, padding: "12px 22px", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "13px", zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.18)", background: toast.type === "error" ? "#dc2626" : toast.type === "info" ? "#2563eb" : "#059669" }} className="fade-in">
          {toast.msg}
        </div>
      )}

      {/* ── Modal Overlay ── */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }} onClick={() => setModal(null)}>
          <div style={{ ...S.card, padding: "24px", minWidth: "420px", maxWidth: "90vw", maxHeight: "80vh", overflow: "auto" }} className="fade-in" onClick={(e) => e.stopPropagation()}>
            {modal}
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {showReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowReceipt(null)}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "32px", width: "340px", fontFamily: S.mono, fontSize: "12px" }} className="fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", borderBottom: "2px dashed #d1d5db", paddingBottom: "12px", marginBottom: "12px" }}>
              <div style={{ fontWeight: 900, fontSize: "16px", fontFamily: S.font }}>{storeSettings.name}</div>
              {storeSettings.address && <div style={{ color: "#6b7280", fontSize: "11px" }}>{storeSettings.address}</div>}
              {storeSettings.phone && <div style={{ color: "#6b7280", fontSize: "11px" }}>Tel: {storeSettings.phone}</div>}
              <div style={{ marginTop: "8px", fontWeight: 700 }}>{showReceipt.receiptNo}</div>
              <div style={{ color: "#6b7280" }}>{fmtFull(showReceipt.date)}</div>
              <div style={{ color: "#6b7280" }}>Customer: {showReceipt.customerName}</div>
            </div>
            <div style={{ borderBottom: "1px dashed #d1d5db", paddingBottom: "8px", marginBottom: "8px" }}>
              {showReceipt.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: "#6b7280" }}>{item.qty} x {fmt(item.price - (item.itemDiscount || 0))}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{fmt(item.lineTotal)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{fmt(showReceipt.subtotal)}</span></div>
              {showReceipt.discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}><span>Discount</span><span>-{fmt(showReceipt.discountAmt)}</span></div>}
              {showReceipt.taxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax ({showReceipt.taxRate}%)</span><span>{fmt(showReceipt.taxAmt)}</span></div>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "18px", fontFamily: S.font, borderTop: "2px dashed #d1d5db", paddingTop: "10px", marginTop: "8px" }}>
              <span>TOTAL</span><span>{fmt(showReceipt.grandTotal)}</span>
            </div>
            <div style={{ fontSize: "11px", marginTop: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment</span><span style={{ textTransform: "uppercase" }}>{showReceipt.paymentMethod}</span></div>
              {showReceipt.paymentMethod === "cash" && <>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Received</span><span>{fmt(showReceipt.cashReceived)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Change</span><span>{fmt(showReceipt.change)}</span></div>
              </>}
            </div>
            <div style={{ textAlign: "center", marginTop: "16px", color: "#6b7280", fontSize: "11px", borderTop: "2px dashed #d1d5db", paddingTop: "12px" }}>
              {storeSettings.receiptFooter}
            </div>
            <button onClick={() => setShowReceipt(null)} style={{ ...S.btn(), width: "100%", marginTop: "16px", justifyContent: "center" }}>Close Receipt</button>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <div style={{ width: "68px", background: "#111827", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "16px", gap: "4px", flexShrink: 0 }}>
        <div style={{ width: "40px", height: "40px", background: "#059669", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "20px" }}>🏪</div>
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ width: "52px", height: "52px", border: "none", borderRadius: "12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", background: activeTab === item.id ? "#1f2937" : "transparent", color: activeTab === item.id ? "#fff" : "#6b7280", transition: "all 0.15s" }}>
            <span style={{ opacity: activeTab === item.id ? 1 : 0.6 }}>{item.icon}</span>
            <span style={{ fontSize: "9px", fontWeight: 700, fontFamily: S.font }}>{item.label}</span>
          </button>
        ))}
        {/* Low stock badge */}
        {lowStockProducts.length > 0 && (
          <div style={{ marginTop: "auto", marginBottom: "16px", position: "relative" }}>
            <button onClick={() => setActiveTab("products")} style={{ width: "40px", height: "40px", border: "none", borderRadius: "10px", background: "#fef3c7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#92400e" }}>
              {Icons.alert}
            </button>
            <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#dc2626", color: "#fff", fontSize: "10px", fontWeight: 800, width: "18px", height: "18px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {lowStockProducts.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflow: "auto", height: "100vh" }}>

        {/* ═══════════════ POS TAB ═══════════════ */}
        {activeTab === "pos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", height: "100vh" }}>
            {/* Left - Products */}
            <div style={{ padding: "16px 20px", overflow: "auto" }}>
              {/* Search + Barcode */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input ref={barcodeRef} placeholder="Search or scan barcode..." value={search} onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && search) { handleBarcodeScan(search); setSearch(""); } }}
                    style={{ ...S.input, paddingLeft: "36px" }} />
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>{Icons.search}</span>
                </div>
                {heldOrders.length > 0 && (
                  <button onClick={() => setModal(
                    <div>
                      <h3 style={{ margin: "0 0 16px" }}>Held Orders ({heldOrders.length})</h3>
                      {heldOrders.map((h) => (
                        <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13px" }}>{h.cart.length} items · {fmt(h.cart.reduce((s, i) => s + i.price * i.qty, 0))}</div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{fmtFull(h.date)}</div>
                          </div>
                          <button onClick={() => { recallOrder(h.id); setModal(null); }} style={S.btn("#059669")}>Recall</button>
                        </div>
                      ))}
                    </div>
                  )} style={S.btn("#f59e0b", "#000")}>
                    {Icons.hold} <span>{heldOrders.length}</span>
                  </button>
                )}
              </div>

              {/* Price Mode + Category Filters */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["All", ...categories].map((c) => (
                    <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "6px 14px", borderRadius: "20px", border: catFilter === c ? "2px solid #111827" : "1px solid #e5e7eb", background: catFilter === c ? "#111827" : "#fff", color: catFilter === c ? "#fff" : "#6b7280", cursor: "pointer", fontSize: "12px", fontWeight: 700, fontFamily: S.font }}>
                      {c}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "3px", gap: "3px", flexShrink: 0 }}>
                  {[{ key: "retail", label: "🏷 Retail" }, { key: "wholesale", label: "📦 Wholesale" }].map(({ key, label }) => (
                    <button key={key} onClick={() => switchPriceMode(key)} style={{ padding: "5px 12px", borderRadius: "7px", border: "none", background: priceMode === key ? (key === "wholesale" ? "#7c3aed" : "#111827") : "transparent", color: priceMode === key ? "#fff" : "#6b7280", cursor: "pointer", fontWeight: 700, fontSize: "11px", fontFamily: S.font, transition: "all 0.15s" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
                {filteredProducts.map((p) => {
                  const inCart = cart.find((c) => c.id === p.id);
                  const cc = getCatColor(p.category);
                  const outOfStock = p.stock <= 0;
                  const lowStock = p.stock <= p.lowStockThreshold && p.stock > 0;
                  return (
                    <button key={p.id} onClick={() => addToCart(p)} disabled={outOfStock}
                      style={{ ...S.card, padding: "12px", cursor: outOfStock ? "not-allowed" : "pointer", border: `2px solid ${inCart ? cc.border : "#e5e7eb"}`, background: outOfStock ? "#f9fafb" : inCart ? cc.light : "#fff", textAlign: "left", position: "relative", opacity: outOfStock ? 0.5 : 1, transition: "all 0.12s" }}>
                      {inCart && <span style={{ position: "absolute", top: "-8px", right: "-8px", background: cc.border, color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800 }}>{inCart.qty}</span>}
                      {lowStock && <span style={{ position: "absolute", top: "6px", right: "6px", background: "#fef3c7", color: "#92400e", fontSize: "9px", fontWeight: 800, padding: "1px 5px", borderRadius: "4px" }}>LOW</span>}
                      {p.image && <img src={p.image} alt={p.name} style={{ width: "100%", height: "72px", objectFit: "cover", borderRadius: "6px", marginBottom: "6px" }} />}
                      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "2px", lineHeight: "1.2" }}>{p.name}</div>
                      <div style={{ fontSize: "10px", color: "#9ca3af" }}>{p.sku}</div>
                      <div style={{ fontFamily: S.mono, fontSize: "14px", fontWeight: 700, color: priceMode === "wholesale" ? "#7c3aed" : cc.text, marginTop: "4px" }}>
                        {fmt(getActivePrice(p))}
                      </div>
                      {p.wholesalePrice && priceMode === "retail" && (
                        <div style={{ fontSize: "10px", color: "#7c3aed", fontWeight: 600 }}>WS: {fmt(p.wholesalePrice)}</div>
                      )}
                      {priceMode === "wholesale" && (
                        <div style={{ fontSize: "10px", color: "#9ca3af" }}>Retail: {fmt(p.price)}</div>
                      )}
                      <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>
                        Stock: {p.stock} {p.unit}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right - Cart Panel */}
            <div style={{ background: "#fff", borderLeft: "1px solid #e5e7eb", display: "flex", flexDirection: "column", height: "100vh" }}>
              {/* Cart Header */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: "15px" }}>Current Sale</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={holdOrder} style={{ ...S.btn("#f3f4f6", "#374151"), padding: "6px 10px", fontSize: "11px" }}>Hold</button>
                    <button onClick={clearCart} style={{ ...S.btn("#fef2f2", "#dc2626"), padding: "6px 10px", fontSize: "11px" }}>Clear</button>
                  </div>
                </div>
                {/* Customer selector */}
                <div style={{ marginTop: "8px" }}>
                  <select value={selectedCustomer?.id || ""} onChange={(e) => setSelectedCustomer(customers.find((c) => c.id === e.target.value) || null)}
                    style={{ ...S.input, fontSize: "12px", padding: "6px 10px" }}>
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.loyaltyPoints || 0} pts)</option>)}
                  </select>
                </div>
              </div>

              {/* Cart Items */}
              <div style={{ flex: 1, overflow: "auto", padding: "8px 16px" }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>🛒</div>
                    <div style={{ fontWeight: 600 }}>Cart is empty</div>
                    <div style={{ fontSize: "12px" }}>Tap products or scan barcode</div>
                  </div>
                ) : cart.map((item) => (
                  <div key={item.id} className="slide-r" style={{ padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>{item.name}</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>{fmt(item.price)} × {item.qty}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button onClick={() => updateCartQty(item.id, item.qty - 1)} style={{ width: "26px", height: "26px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}>−</button>
                        <input type="number" value={item.qty} onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 0)}
                          style={{ width: "36px", textAlign: "center", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "3px", fontFamily: S.mono, fontWeight: 700, fontSize: "13px" }} />
                        <button onClick={() => updateCartQty(item.id, item.qty + 1)} style={{ width: "26px", height: "26px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}>+</button>
                      </div>
                      <div style={{ minWidth: "70px", textAlign: "right", fontFamily: S.mono, fontWeight: 700, fontSize: "13px" }}>
                        {fmt((item.price - (item.itemDiscount || 0)) * item.qty)}
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", marginLeft: "4px", padding: "4px" }}>{Icons.x}</button>
                    </div>
                    {/* Item discount */}
                    {item.itemDiscount > 0 && (
                      <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "2px" }}>Discount: -{fmt(item.itemDiscount)}/unit</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div style={{ padding: "14px 16px", borderTop: "1px solid #e5e7eb", background: "#fafafa" }}>
                  {/* Discount */}
                  <div style={{ marginBottom: "10px" }}>
                    <div style={S.label}>Order Discount</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <select value={discount.type} onChange={(e) => setDiscount({ type: e.target.value, value: 0 })} style={{ ...S.input, width: "auto", flex: "0 0 100px", fontSize: "12px" }}>
                        <option value="none">None</option>
                        <option value="percent">%</option>
                        <option value="fixed">Fixed</option>
                      </select>
                      {discount.type !== "none" && (
                        <input type="number" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                          style={{ ...S.input, fontSize: "12px" }} placeholder={discount.type === "percent" ? "0%" : "₭0"} />
                      )}
                    </div>
                  </div>

                  {/* Totals */}
                  <div style={{ fontSize: "12px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}><span style={{ color: "#6b7280" }}>Subtotal</span><span style={{ fontFamily: S.mono }}>{fmt(subtotal)}</span></div>
                    {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626", marginBottom: "2px" }}><span>Discount</span><span style={{ fontFamily: S.mono }}>-{fmt(discountAmt)}</span></div>}
                    {storeSettings.taxRate > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}><span style={{ color: "#6b7280" }}>Tax ({storeSettings.taxRate}%)</span><span style={{ fontFamily: S.mono }}>{fmt(taxAmt)}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}><span style={{ color: "#059669" }}>Profit</span><span style={{ fontFamily: S.mono, color: "#059669", fontWeight: 700 }}>{fmt(totalProfit)}</span></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "22px", marginBottom: "12px" }}>
                    <span>Total</span><span style={{ fontFamily: S.mono }}>{fmt(grandTotal)}</span>
                  </div>

                  {/* Payment Method */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {["cash", "qr"].map((m) => (
                      <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: paymentMethod === m ? "2px solid #111827" : "1px solid #e5e7eb", background: paymentMethod === m ? "#111827" : "#fff", color: paymentMethod === m ? "#fff" : "#6b7280", cursor: "pointer", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", fontFamily: S.font }}>
                        {m === "cash" ? "💵" : "📱"} {m}
                      </button>
                    ))}
                  </div>

                  {/* Cash input */}
                  {paymentMethod === "cash" && (
                    <div style={{ marginBottom: "10px" }}>
                      <div style={S.label}>Cash Received</div>
                      <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)}
                        style={{ ...S.input, fontSize: "18px", fontFamily: S.mono, fontWeight: 700, textAlign: "center" }} placeholder="₭0" />
                      {Number(cashReceived) >= grandTotal && (
                        <div style={{ textAlign: "center", color: "#059669", fontWeight: 800, fontSize: "16px", fontFamily: S.mono, marginTop: "6px" }}>
                          Change: {fmt(changeAmt)}
                        </div>
                      )}
                      {/* Quick cash buttons */}
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                        {[grandTotal, Math.ceil(grandTotal / 5000) * 5000, Math.ceil(grandTotal / 10000) * 10000, Math.ceil(grandTotal / 50000) * 50000, Math.ceil(grandTotal / 100000) * 100000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4).map((v) => (
                          <button key={v} onClick={() => setCashReceived(String(v))} style={{ ...S.btn("#f3f4f6", "#374151"), padding: "6px 10px", fontSize: "11px", fontFamily: S.mono }}>{fmt(v)}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={completeSale} style={{ ...S.btn("#059669"), width: "100%", padding: "14px", fontSize: "16px", fontWeight: 900, justifyContent: "center", borderRadius: "10px" }}>
                    {Icons.check} Complete Sale
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ SALES HISTORY ═══════════════ */}
        {activeTab === "history" && (
          <div style={{ padding: "20px 24px", maxWidth: "1100px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: "20px" }}>Sales History</h2>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "4px", background: "#fff", borderRadius: "10px", padding: "3px", border: "1px solid #e5e7eb" }}>
                  {["today", "week", "month", "all"].map((f) => (
                    <button key={f} onClick={() => setDateFilter(f)} style={{ padding: "6px 12px", borderRadius: "7px", border: "none", background: dateFilter === f ? "#111827" : "transparent", color: dateFilter === f ? "#fff" : "#6b7280", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: S.font, textTransform: "capitalize" }}>{f}</button>
                  ))}
                </div>
                <button onClick={exportToExcel} style={S.btn("#059669")}>{Icons.download} Export</button>
              </div>
            </div>

            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { l: "Revenue", v: fmt(totals.revenue), c: "#2563eb", icon: "💰" },
                { l: "Cost", v: fmt(totals.cost), c: "#dc2626", icon: "📦" },
                { l: "Profit", v: fmt(totals.profit), c: "#059669", icon: "📈" },
                { l: "Tax", v: fmt(totals.tax), c: "#7c3aed", icon: "🏛" },
                { l: "Refunds", v: fmt(totals.refunds), c: "#f59e0b", icon: "↩️" },
              ].map((s) => (
                <div key={s.l} style={{ ...S.card, padding: "14px", borderLeft: `4px solid ${s.c}` }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 700, marginBottom: "4px" }}>{s.icon} {s.l}</div>
                  <div style={{ fontFamily: S.mono, fontSize: "18px", fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Sales List */}
            <div style={S.card}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>No sales found</div>
              ) : filtered.map((sale) => (
                <div key={sale.id} style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: "13px", fontFamily: S.mono }}>{sale.receiptNo}</span>
                      <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, background: sale.status === "completed" ? "#d1fae5" : "#fee2e2", color: sale.status === "completed" ? "#065f46" : "#991b1b" }}>
                        {sale.status}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, background: "#f3f4f6", color: "#6b7280", textTransform: "uppercase" }}>
                        {sale.paymentMethod}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      {fmtFull(sale.date)} · {sale.customerName} · {sale.items.map((i) => `${i.name}×${i.qty}`).join(", ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: S.mono, fontWeight: 800, fontSize: "16px" }}>{fmt(sale.grandTotal)}</div>
                      <div style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>+{fmt(sale.totalProfit)}</div>
                    </div>
                    <button onClick={() => setShowReceipt(sale)} style={{ ...S.btn("#f3f4f6", "#374151"), padding: "6px 8px" }}>{Icons.receipt}</button>
                    <button onClick={() => setEditSale({ ...sale, grandTotal: String(sale.grandTotal) })} style={{ ...S.btn("#eff6ff", "#2563eb"), padding: "6px 8px" }}>{Icons.edit}</button>
                    {sale.status === "completed" && (
                      <button onClick={() => refundSale(sale.id)} style={{ ...S.btn("#fef2f2", "#dc2626"), padding: "6px 8px" }}>{Icons.refund}</button>
                    )}
                    <button onClick={() => deleteSale(sale.id)} style={{ ...S.btn("#fef2f2", "#dc2626"), padding: "6px 8px" }}>{Icons.trash}</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Sale Modal */}
            {editSale && (
              <div onClick={() => setEditSale(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "16px", padding: "28px", width: "520px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                  <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: "16px" }}>Edit Sale · {editSale.receiptNo}</h3>

                  {/* Info fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                    <div>
                      <div style={S.label}>Customer Name</div>
                      <input value={editSale.customerName} onChange={(e) => setEditSale({ ...editSale, customerName: e.target.value })} style={S.input} />
                    </div>
                    <div>
                      <div style={S.label}>Payment Method</div>
                      <select value={editSale.paymentMethod} onChange={(e) => setEditSale({ ...editSale, paymentMethod: e.target.value })} style={S.input}>
                        <option value="cash">Cash</option>
                        <option value="qr">QR</option>
                      </select>
                    </div>
                    <div>
                      <div style={S.label}>Status</div>
                      <select value={editSale.status} onChange={(e) => setEditSale({ ...editSale, status: e.target.value })} style={S.input}>
                        <option value="completed">Completed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={S.label}>Items</div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 32px", gap: "0", background: "#f9fafb", padding: "8px 12px", fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                      <span>Item</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Subtotal</span><span />
                    </div>
                    {editSale.items.map((item, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 32px", alignItems: "center", padding: "10px 12px", borderTop: "1px solid #f3f4f6" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "13px" }}>{item.name}</div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>{fmt(item.price)} each</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <button onClick={() => updateEditSaleQty(idx, item.qty - 1)} style={{ width: "22px", height: "22px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontWeight: 800, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          <input type="number" min="1" value={item.qty} onChange={(e) => updateEditSaleQty(idx, e.target.value)} style={{ width: "36px", textAlign: "center", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "2px 4px", fontSize: "13px", fontWeight: 700, fontFamily: S.mono }} />
                          <button onClick={() => updateEditSaleQty(idx, item.qty + 1)} style={{ width: "22px", height: "22px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontWeight: 800, fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        </div>
                        <div style={{ textAlign: "right", fontFamily: S.mono, fontWeight: 700, fontSize: "13px" }}>{fmt(item.lineTotal)}</div>
                        <button onClick={() => removeEditSaleItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", display: "flex", justifyContent: "center" }}>{Icons.trash}</button>
                      </div>
                    ))}
                  </div>

                  {/* Totals summary */}
                  <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
                    {editSale.discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}><span>Discount</span><span>− {fmt(editSale.discountAmt)}</span></div>}
                    {editSale.taxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}><span>Tax</span><span>{fmt(editSale.taxAmt)}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "15px" }}><span>Grand Total</span><span style={{ fontFamily: S.mono }}>{fmt(editSale.grandTotal)}</span></div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button onClick={() => setEditSale(null)} style={S.btn("#f3f4f6", "#374151")}>Cancel</button>
                    <button onClick={saveEditedSale} style={S.btn()}>Save Changes</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ PRODUCTS ═══════════════ */}
        {activeTab === "products" && (
          <div style={{ padding: "20px 24px", maxWidth: "1100px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: "20px" }}>Products & Inventory</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => {
                  setEditProduct({ id: null, name: "", sku: "", cost: "", price: "", wholesalePrice: "", category: "Other", stock: "", lowStockThreshold: 10, unit: "pc", barcode: "", image: "" });
                }} style={S.btn()}>{Icons.plus} Add Product</button>
              </div>
            </div>

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
              <div style={{ ...S.card, padding: "14px 16px", marginBottom: "16px", borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}>
                <div style={{ fontWeight: 800, fontSize: "13px", color: "#92400e", marginBottom: "6px" }}>⚠️ Low Stock Alerts</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {lowStockProducts.map((p) => (
                    <span key={p.id} style={{ background: "#fef3c7", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                      {p.name}: {p.stock} {p.unit} left
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add/Edit Product Form */}
            {editProduct && (
              <div style={{ ...S.card, padding: "20px", marginBottom: "16px", border: "2px solid #111827" }} className="fade-in">
                <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>{editProduct.id ? "Edit Product" : "New Product"}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                  {[
                    { key: "name", label: "Name", type: "text", ph: "Product name" },
                    { key: "sku", label: "SKU", type: "text", ph: "e.g. DRK-001" },
                    { key: "barcode", label: "Barcode", type: "text", ph: "Barcode number" },
                    { key: "category", label: "Category", type: "select", options: categories },
                    { key: "cost", label: "Cost (₭)", type: "number", ph: "0" },
                    { key: "price", label: "Retail Price (₭)", type: "number", ph: "0" },
                    { key: "wholesalePrice", label: "Wholesale Price (₭)", type: "number", ph: "0" },
                    { key: "stock", label: "Stock", type: "number", ph: "0" },
                    { key: "unit", label: "Unit", type: "text", ph: "pc, kg, cup..." },
                    { key: "lowStockThreshold", label: "Low Stock Alert", type: "number", ph: "10" },
                  ].map((f) => (
                    <div key={f.key}>
                      <div style={S.label}>{f.label}</div>
                      {f.type === "select" ? (
                        <select value={editProduct[f.key]} onChange={(e) => setEditProduct({ ...editProduct, [f.key]: e.target.value })} style={S.input}>
                          {f.options.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={f.type} value={editProduct[f.key]} onChange={(e) => setEditProduct({ ...editProduct, [f.key]: f.type === "number" ? e.target.value : e.target.value })}
                          style={S.input} placeholder={f.ph} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Image upload */}
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <label style={{ cursor: "pointer" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "10px", border: "2px dashed #d1d5db", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                      {editProduct.image
                        ? <img src={editProduct.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: "28px" }}>📷</span>}
                    </div>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleProductImage(e.target.files[0])} />
                  </label>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>Product Image</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>Click to upload · auto-cropped to 512×512</div>
                    {editProduct.image && (
                      <button onClick={() => setEditProduct((p) => ({ ...p, image: "" }))} style={{ marginTop: "6px", fontSize: "11px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>Remove image</button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button onClick={() => {
                    if (!editProduct.name || !editProduct.cost || !editProduct.price) { notify("Fill required fields!", "error"); return; }
                    const p = { ...editProduct, cost: Number(editProduct.cost), price: Number(editProduct.price), wholesalePrice: Number(editProduct.wholesalePrice) || 0, stock: Number(editProduct.stock) || 0, lowStockThreshold: Number(editProduct.lowStockThreshold) || 10 };
                    if (p.id) { setProducts((prev) => prev.map((pp) => pp.id === p.id ? p : pp)); }
                    else { p.id = ID(); setProducts((prev) => [...prev, p]); }
                    setEditProduct(null);
                    notify(p.id ? "Product updated!" : "Product added!");
                  }} style={S.btn("#059669")}>{Icons.check} Save</button>
                  <button onClick={() => setEditProduct(null)} style={S.btn("#f3f4f6", "#6b7280")}>Cancel</button>
                </div>
              </div>
            )}

            {/* Stock Adjustment */}
            <div style={S.card}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    {["Product", "SKU", "Category", "Cost", "Retail", "Wholesale", "Margin", "Stock", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const cc = getCatColor(p.category);
                    const margin = p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(0) : 0;
                    const lowStock = p.stock <= p.lowStockThreshold;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {p.image
                              ? <img src={p.image} alt="" style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                              : <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>📦</div>}
                            {p.name}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: S.mono, fontSize: "11px", color: "#6b7280" }}>{p.sku}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: cc.bg, color: cc.text, padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>{p.category}</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: S.mono }}>{fmt(p.cost)}</td>
                        <td style={{ padding: "10px 12px", fontFamily: S.mono, fontWeight: 700 }}>{fmt(p.price)}</td>
                        <td style={{ padding: "10px 12px", fontFamily: S.mono, color: "#7c3aed", fontWeight: 700 }}>{p.wholesalePrice ? fmt(p.wholesalePrice) : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ color: Number(margin) > 40 ? "#059669" : "#f59e0b", fontWeight: 700 }}>{margin}%</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <button onClick={() => setProducts((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, stock: Math.max(0, pp.stock - 1) } : pp))}
                              style={{ width: "22px", height: "22px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>−</button>
                            <span style={{ fontFamily: S.mono, fontWeight: 700, minWidth: "36px", textAlign: "center", color: lowStock ? "#dc2626" : "#111827" }}>
                              {p.stock}
                            </span>
                            <button onClick={() => setProducts((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, stock: pp.stock + 1 } : pp))}
                              style={{ width: "22px", height: "22px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>+</button>
                            <button onClick={() => {
                              const qty = prompt("Add stock quantity:");
                              if (qty && !isNaN(qty)) setProducts((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, stock: pp.stock + Number(qty) } : pp));
                            }} style={{ fontSize: "10px", background: "#f3f4f6", border: "none", borderRadius: "4px", padding: "3px 6px", cursor: "pointer", fontWeight: 700, color: "#6b7280" }}>+N</button>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button onClick={() => setEditProduct({ ...p, cost: String(p.cost), price: String(p.price), wholesalePrice: String(p.wholesalePrice || ""), stock: String(p.stock), lowStockThreshold: String(p.lowStockThreshold), image: p.image || "" })}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "4px" }}>{Icons.edit}</button>
                            <button onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) setProducts((prev) => prev.filter((pp) => pp.id !== p.id)); }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "4px" }}>{Icons.trash}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════ CUSTOMERS ═══════════════ */}
        {activeTab === "customers" && (
          <div style={{ padding: "20px 24px", maxWidth: "1100px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: "20px" }}>Customers</h2>
              <button onClick={() => setModal(
                <CustomerForm onSave={(c) => { setCustomers((p) => [...p, { ...c, id: ID(), totalSpent: 0, visits: 0, loyaltyPoints: 0, createdAt: new Date().toISOString() }]); setModal(null); notify("Customer added!"); }} />
              )} style={S.btn()}>{Icons.plus} Add Customer</button>
            </div>

            <div style={S.card}>
              {customers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>👥</div>
                  No customers yet. Add your first customer above.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["Name", "Phone", "Email", "Visits", "Total Spent", "Loyalty Points", "Last Visit", "Actions"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{c.name}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{c.phone || "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{c.email || "—"}</td>
                        <td style={{ padding: "10px 12px", fontFamily: S.mono }}>{c.visits || 0}</td>
                        <td style={{ padding: "10px 12px", fontFamily: S.mono, fontWeight: 700 }}>{fmt(c.totalSpent || 0)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}>⭐ {c.loyaltyPoints || 0}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: "12px" }}>{c.lastVisit ? fmtDate(c.lastVisit) : "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <button onClick={() => { if (window.confirm(`Delete "${c.name}"?`)) setCustomers((p) => p.filter((cc) => cc.id !== c.id)); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>{Icons.trash}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ DASHBOARD ═══════════════ */}
        {activeTab === "dashboard" && (
          <div style={{ padding: "20px 24px", maxWidth: "1100px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: "20px" }}>Dashboard</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ display: "flex", gap: "4px", background: "#fff", borderRadius: "10px", padding: "3px", border: "1px solid #e5e7eb" }}>
                  {["today", "week", "month", "all"].map((f) => (
                    <button key={f} onClick={() => setDateFilter(f)} style={{ padding: "6px 12px", borderRadius: "7px", border: "none", background: dateFilter === f ? "#111827" : "transparent", color: dateFilter === f ? "#fff" : "#6b7280", cursor: "pointer", fontWeight: 700, fontSize: "12px", fontFamily: S.font, textTransform: "capitalize" }}>{f}</button>
                  ))}
                </div>
                <button onClick={exportToExcel} style={S.btn("#059669")}>{Icons.download} Export</button>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
              {[
                { l: "Net Revenue", v: fmt(netRevenue), c: "#2563eb", sub: `${totals.transactions} sales` },
                { l: "Gross Profit", v: fmt(totals.profit), c: "#059669", sub: `Margin: ${pct(totals.profit, totals.revenue)}` },
                { l: "Avg Sale", v: fmt(totals.transactions ? totals.revenue / totals.transactions : 0), c: "#7c3aed", sub: `Avg profit: ${fmt(totals.transactions ? totals.profit / totals.transactions : 0)}` },
                { l: "Discounts", v: fmt(totals.discounts), c: "#f59e0b", sub: `Tax: ${fmt(totals.tax)}` },
              ].map((k) => (
                <div key={k.l} style={{ ...S.card, padding: "16px", borderTop: `4px solid ${k.c}` }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 700, marginBottom: "4px" }}>{k.l}</div>
                  <div style={{ fontFamily: S.mono, fontSize: "24px", fontWeight: 900 }}>{k.v}</div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              {/* Top Products */}
              <div style={{ ...S.card, padding: "20px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: "14px" }}>🏆 Top Products by Revenue</h3>
                {(() => {
                  const pm = {};
                  completedSales.forEach((s) => s.items.forEach((i) => {
                    if (!pm[i.name]) pm[i.name] = { rev: 0, qty: 0, profit: 0 };
                    pm[i.name].rev += i.lineTotal; pm[i.name].qty += i.qty; pm[i.name].profit += i.lineProfit;
                  }));
                  const sorted = Object.entries(pm).sort((a, b) => b[1].rev - a[1].rev);
                  const max = sorted[0]?.[1].rev || 1;
                  if (!sorted.length) return <div style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>No data</div>;
                  return sorted.slice(0, 8).map(([n, d], i) => (
                    <div key={n} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                        <span style={{ fontWeight: 700 }}>{i + 1}. {n}</span>
                        <span style={{ fontFamily: S.mono, fontWeight: 700 }}>{fmt(d.rev)}</span>
                      </div>
                      <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                        <div style={{ background: `hsl(${210 + i * 20}, 70%, 50%)`, height: "100%", width: `${(d.rev / max) * 100}%`, borderRadius: "4px" }} />
                      </div>
                      <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "1px" }}>{d.qty} sold · Profit: {fmt(d.profit)}</div>
                    </div>
                  ));
                })()}
              </div>

              {/* Payment Methods */}
              <div style={{ ...S.card, padding: "20px" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: "14px" }}>💳 Payment Methods</h3>
                {(() => {
                  const pm = {};
                  completedSales.forEach((s) => {
                    pm[s.paymentMethod] = pm[s.paymentMethod] || { count: 0, amt: 0 };
                    pm[s.paymentMethod].count++; pm[s.paymentMethod].amt += s.grandTotal;
                  });
                  const total = Object.values(pm).reduce((s, d) => s + d.amt, 0) || 1;
                  const colors = { cash: "#059669", qr: "#f59e0b" };
                  const entries = Object.entries(pm).sort((a, b) => b[1].amt - a[1].amt);
                  if (!entries.length) return <div style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>No data</div>;
                  return (
                    <>
                      <div style={{ display: "flex", height: "20px", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
                        {entries.map(([m, d]) => (
                          <div key={m} style={{ width: `${(d.amt / total) * 100}%`, background: colors[m] || "#6b7280", transition: "width 0.3s" }} />
                        ))}
                      </div>
                      {entries.map(([m, d]) => (
                        <div key={m} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: colors[m] || "#6b7280" }} />
                            <span style={{ fontWeight: 700, fontSize: "13px", textTransform: "capitalize" }}>{m}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: S.mono, fontWeight: 700 }}>{fmt(d.amt)}</div>
                            <div style={{ fontSize: "10px", color: "#9ca3af" }}>{d.count} transactions · {pct(d.amt, total)}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Daily Breakdown */}
            <div style={{ ...S.card, padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: "14px" }}>📅 Daily Breakdown</h3>
              {(() => {
                const dm = {};
                completedSales.forEach((s) => {
                  const d = new Date(s.date).toDateString();
                  dm[d] = dm[d] || { rev: 0, cost: 0, profit: 0, count: 0, tax: 0 };
                  dm[d].rev += s.grandTotal; dm[d].cost += s.totalCost; dm[d].profit += s.totalProfit; dm[d].count++; dm[d].tax += s.taxAmt;
                });
                const days = Object.entries(dm).sort((a, b) => new Date(b[0]) - new Date(a[0])).slice(0, 14);
                if (!days.length) return <div style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>No data</div>;
                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        {["Date", "Sales", "Revenue", "Cost", "Profit", "Tax", "Margin"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 800, color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map(([day, d]) => (
                        <tr key={day} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 700 }}>{fmtDate(day)}</td>
                          <td style={{ padding: "8px 10px" }}>{d.count}</td>
                          <td style={{ padding: "8px 10px", fontFamily: S.mono }}>{fmt(d.rev)}</td>
                          <td style={{ padding: "8px 10px", fontFamily: S.mono, color: "#dc2626" }}>{fmt(d.cost)}</td>
                          <td style={{ padding: "8px 10px", fontFamily: S.mono, color: "#059669", fontWeight: 700 }}>{fmt(d.profit)}</td>
                          <td style={{ padding: "8px 10px", fontFamily: S.mono }}>{fmt(d.tax)}</td>
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669" }}>{pct(d.profit, d.rev)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}

        {/* ═══════════════ SETTINGS ═══════════════ */}
        {activeTab === "settings" && (
          <div style={{ padding: "20px 24px", maxWidth: "700px" }}>
            <h2 style={{ margin: "0 0 20px", fontWeight: 900, fontSize: "20px" }}>Store Settings</h2>
            <div style={{ ...S.card, padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { key: "name", label: "Store Name", ph: "My Store" },
                  { key: "phone", label: "Phone", ph: "+856 20 xxxx xxxx" },
                  { key: "address", label: "Address", ph: "Vientiane, Laos" },
                  { key: "taxRate", label: "Tax Rate (%)", ph: "0", type: "number" },
                  { key: "currency", label: "Currency Symbol", ph: "₭" },
                  { key: "receiptFooter", label: "Receipt Footer", ph: "Thank you!" },
                ].map((f) => (
                  <div key={f.key}>
                    <div style={S.label}>{f.label}</div>
                    <input type={f.type || "text"} value={storeSettings[f.key]} onChange={(e) => setStoreSettings({ ...storeSettings, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                      style={S.input} placeholder={f.ph} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
                <h3 style={{ fontWeight: 800, fontSize: "14px", marginBottom: "12px", color: "#dc2626" }}>Danger Zone</h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => { if (window.confirm("Clear ALL sales history?")) { setSales([]); notify("Sales cleared"); } }} style={S.btn("#dc2626")}>Clear Sales</button>
                  <button onClick={() => { if (window.confirm("Reset ALL data to defaults?")) { setProducts(DEFAULT_PRODUCTS); setSales([]); setCustomers([]); setHeldOrders([]); notify("All data reset"); } }} style={S.btn("#dc2626")}>Reset Everything</button>
                </div>
              </div>
            </div>

            <div style={{ ...S.card, padding: "24px", marginTop: "16px" }}>
              <h3 style={{ fontWeight: 800, fontSize: "14px", marginBottom: "12px" }}>Manage Categories</h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                {categories.map((c) => (
                  <span key={c} style={{ display: "flex", alignItems: "center", gap: "6px", background: getCatColor(c).bg, color: getCatColor(c).text, padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "12px" }}>
                    {c}
                    {!["Drinks", "Food", "Snacks", "Other"].includes(c) && (
                      <button onClick={() => setCategories((p) => p.filter((cc) => cc !== c))} style={{ background: "none", border: "none", cursor: "pointer", color: getCatColor(c).text, fontSize: "14px", padding: 0 }}>×</button>
                    )}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input id="newCat" placeholder="New category name" style={{ ...S.input, maxWidth: "200px" }} />
                <button onClick={() => {
                  const val = document.getElementById("newCat").value.trim();
                  if (val && !categories.includes(val)) { setCategories((p) => [...p, val]); document.getElementById("newCat").value = ""; notify(`Category "${val}" added!`); }
                }} style={S.btn()}>Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Customer Form Component ───
function CustomerForm({ onSave, initial }) {
  const [form, setForm] = useState(initial || { name: "", phone: "", email: "", notes: "" });
  const S = {
    input: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", fontFamily: "'Nunito Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" },
    label: { fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px", display: "block" },
    btn: (bg = "#111827", color = "#fff") => ({ background: bg, color, border: "none", padding: "9px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "'Nunito Sans', sans-serif" }),
  };
  return (
    <div>
      <h3 style={{ margin: "0 0 16px", fontWeight: 800 }}>Add Customer</h3>
      <div style={{ display: "grid", gap: "12px" }}>
        {[
          { key: "name", label: "Full Name *", ph: "Customer name" },
          { key: "phone", label: "Phone", ph: "+856 20..." },
          { key: "email", label: "Email", ph: "email@example.com" },
          { key: "notes", label: "Notes", ph: "VIP, special requests..." },
        ].map((f) => (
          <div key={f.key}>
            <div style={S.label}>{f.label}</div>
            <input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} style={S.input} placeholder={f.ph} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
        <button onClick={() => { if (form.name) onSave(form); }} style={S.btn("#059669")}>Save Customer</button>
      </div>
    </div>
  );
}
