import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ShoppingBag, Users, DollarSign, Package,
  Star, AlertTriangle, Clock, Award, Download, RefreshCw,
  ShoppingCart, MapPin, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';

const API   = 'https://siraj-backend.onrender.com';
const DARK  = '#1E1023';
const ROSE  = '#BE185D';
const PINK  = '#F472B6';
const MID   = '#6B4A6E';
const LIGHT = '#D8B4D8';
const CREAM = '#FCE7F3';
const PALE  = '#FFF0F6';

const fmt     = (n)  => `${(+n || 0).toFixed(0)} EGP`;
const fmtDec  = (n)  => `${(+n || 0).toFixed(2)} EGP`;
const fmtPct  = (n)  => `${(+n || 0).toFixed(1)}%`;

// ── Shared card wrapper ───────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: '#fff', borderRadius: 14, border: `1px solid ${CREAM}`,
    boxShadow: '0 2px 12px rgba(190,24,93,0.05)', padding: '20px 22px',
    ...style
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.35rem', fontWeight: 700, color: DARK, margin: 0 }}>
      {children}
    </h2>
    {sub && <p style={{ fontSize: 11, color: MID, marginTop: 3 }}>{sub}</p>}
  </div>
);

// Mini bar chart
const MiniBar = ({ value, max, color = ROSE }) => (
  <div style={{ background: CREAM, borderRadius: 4, height: 6, width: '100%', marginTop: 4 }}>
    <div style={{ background: color, borderRadius: 4, height: 6, width: `${Math.min(100, (value / (max || 1)) * 100)}%`, transition: 'width 0.5s ease' }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const token = localStorage.getItem('adminToken');

  // ── All data states ───────────────────────────────────────────────────────
  const [overview,        setOverview]        = useState(null);
  const [recentOrders,    setRecentOrders]    = useState([]);
  const [productPerf,     setProductPerf]     = useState([]);
  const [slowMovers,      setSlowMovers]      = useState([]);
  const [reviewStats,     setReviewStats]     = useState(null);
  const [bazaarEvents,    setBazaarEvents]    = useState([]);
  const [bazaarProducts,  setBazaarProducts]  = useState([]);
  const [dayOfMonthStats, setDayOfMonthStats] = useState([]);
  const [locationStats,   setLocationStats]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState('overview');
  const [expandedEvent,   setExpandedEvent]   = useState(null);

  // ── Fetch all data ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const h = { Authorization: `Bearer ${token}` };

      // 1. Overview (uses updated server.js analytics endpoint)
      const [ovRes, ordRes, prodRes, bazRes, revRes] = await Promise.all([
        fetch(`${API}/api/admin/analytics`,        { headers: h }),
        fetch(`${API}/api/orders`,                 { headers: h }),
        fetch(`${API}/api/products?limit=500`,     { headers: h }),
        fetch(`${API}/api/bazaar`,                 { headers: h }),
        fetch(`${API}/api/reviews`,                { headers: h }),
      ]);

      const [ovData, ordData, prodData, bazData, revData] = await Promise.all([
        ovRes.json(), ordRes.json(), prodRes.json(), bazRes.json(), revRes.json(),
      ]);

      setOverview(ovData);

      // Recent 5 web orders
      const allOrders = Array.isArray(ordData) ? ordData : [];
      setRecentOrders(allOrders.slice(0, 5));

      // ── Product performance (web orders) ──────────────────────────────────
      const products = (prodData.results || []);
      const salesMap = {};          // productId → { name, qty, revenue, lastSold }
      allOrders.forEach(order => {
        (order.items || []).forEach(item => {
          const id = item.productId?.toString() || item.name;
          if (!salesMap[id]) salesMap[id] = { name: item.name, qty: 0, revenue: 0, lastSold: null };
          salesMap[id].qty     += item.quantity;
          salesMap[id].revenue += item.price * item.quantity;
          const d = new Date(order.createdAt);
          if (!salesMap[id].lastSold || d > salesMap[id].lastSold) salesMap[id].lastSold = d;
        });
      });

      // Also add bazaar sales to product performance
      const bazSales = Array.isArray(bazData) ? bazData : [];
      bazSales.forEach(sale => {
        (sale.items || []).forEach(item => {
          const id = item.productId?.toString() || item.productName;
          if (!salesMap[id]) salesMap[id] = { name: item.productName, qty: 0, revenue: 0, lastSold: null };
          salesMap[id].qty     += item.quantity;
          salesMap[id].revenue += item.isFreeGift ? 0 : item.salePrice * item.quantity;
          const d = new Date(sale.createdAt);
          if (!salesMap[id].lastSold || d > salesMap[id].lastSold) salesMap[id].lastSold = d;
        });
      });

      const perfList = Object.entries(salesMap)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.revenue - a.revenue);
      setProductPerf(perfList);

      // ── Slow movers: products with zero sales or last sold > 30 days ago ──
      const now    = new Date();
      const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const sold   = new Set(Object.keys(salesMap));
      const slow   = products
        .filter(p => p.status === 'Active')
        .map(p => {
          const perf     = salesMap[p._id?.toString()];
          const lastSold = perf?.lastSold;
          const daysSince = lastSold ? Math.floor((now - new Date(lastSold)) / (1000 * 60 * 60 * 24)) : null;
          return {
            _id: p._id, name: p.name_en || p.bundleName || p.name,
            price: p.price_egp, stock: p.stock,
            totalQty: perf?.qty || 0,
            lastSold, daysSince,
            neverSold: !perf,
          };
        })
        .filter(p => p.neverSold || (p.daysSince !== null && p.daysSince > 30))
        .sort((a, b) => (b.daysSince ?? 9999) - (a.daysSince ?? 9999));
      setSlowMovers(slow);

      // ── Review stats ───────────────────────────────────────────────────────
      const reviews = Array.isArray(revData) ? revData : [];
      const byProd  = {};
      reviews.forEach(r => {
        const pid  = r.productId?._id?.toString() || r.productId?.toString();
        const name = r.productId?.name_en || r.productId?.bundleName || 'Unknown';
        if (!byProd[pid]) byProd[pid] = { name, ratings: [], count: 0 };
        byProd[pid].ratings.push(r.rating);
        byProd[pid].count++;
      });
      const prodReviews = Object.entries(byProd).map(([id, v]) => ({
        id, name: v.name,
        count: v.count,
        avg: v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length,
      })).sort((a, b) => b.count - a.count);

      setReviewStats({
        total:     reviews.length,
        avgRating: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0,
        byProduct: prodReviews,
        lowRated:  prodReviews.filter(p => p.avg < 3.5 && p.count >= 2),
        topRated:  prodReviews.filter(p => p.avg >= 4.5).slice(0, 5),
      });

      // ── Bazaar event stats ─────────────────────────────────────────────────
      const evMap = {};
      bazSales.forEach(s => {
        const eid = s.eventId || 'walkin';
        if (!evMap[eid]) evMap[eid] = {
          eventId: eid, eventName: s.eventName || 'Walk-in',
          eventLocation: s.eventLocation || '',
          revenue: 0, cash: 0, instapay: 0, saleCount: 0,
          gifts: 0, discounts: 0, days: new Set(),
        };
        evMap[eid].revenue   += s.totalAmount;
        evMap[eid].cash      += s.paymentMethod !== 'InstaPay' ? s.totalAmount : 0;
        evMap[eid].instapay  += s.paymentMethod === 'InstaPay' ? s.totalAmount : 0;
        evMap[eid].saleCount += 1;
        evMap[eid].discounts += s.orderDiscount || 0;
        evMap[eid].days.add(s.bazaarDay);
        (s.items || []).forEach(i => { if (i.isFreeGift) evMap[eid].gifts++; });
      });
      setBazaarEvents(Object.values(evMap).map(ev => ({ ...ev, days: ev.days.size })).sort((a, b) => b.revenue - a.revenue));

      // ── Bazaar product performance ─────────────────────────────────────────
      const bpMap = {};
      bazSales.forEach(s => {
        (s.items || []).forEach(item => {
          const key = item.productName;
          if (!bpMap[key]) bpMap[key] = { name: key, qty: 0, revenue: 0, gifts: 0 };
          bpMap[key].qty     += item.quantity;
          bpMap[key].revenue += item.isFreeGift ? 0 : item.salePrice * item.quantity;
          if (item.isFreeGift) bpMap[key].gifts += item.quantity;
        });
      });
      setBazaarProducts(Object.values(bpMap).sort((a, b) => b.revenue - a.revenue));

      // ── Day-of-month performance (bazaar) ─────────────────────────────────
      const domMap = {};
      bazSales.forEach(s => {
        const d = s.dayOfMonth || new Date(s.createdAt).getDate();
        if (!domMap[d]) domMap[d] = { day: d, revenue: 0, sales: 0 };
        domMap[d].revenue += s.totalAmount;
        domMap[d].sales++;
      });
      setDayOfMonthStats(Object.values(domMap).sort((a, b) => a.day - b.day));

      // ── Location performance ───────────────────────────────────────────────
      const locMap = {};
      bazSales.forEach(s => {
        const loc = s.eventLocation || 'Unknown';
        if (!locMap[loc]) locMap[loc] = { location: loc, revenue: 0, sales: 0 };
        locMap[loc].revenue += s.totalAmount;
        locMap[loc].sales++;
      });
      setLocationStats(Object.values(locMap).sort((a, b) => b.revenue - a.revenue));

    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Export customers ──────────────────────────────────────────────────────
  const exportAllCustomers = async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [ordRes, bazRes, revRes] = await Promise.all([
        fetch(`${API}/api/orders`, { headers: h }),
        fetch(`${API}/api/bazaar`, { headers: h }),
        fetch(`${API}/api/reviews`, { headers: h }),
      ]);
      const [orders, bazSales, reviews] = await Promise.all([ordRes.json(), bazRes.json(), revRes.json()]);

      const rows = [['Source', 'Name', 'Phone', 'Email', 'Date', 'Total EGP', 'Payment']];
      (Array.isArray(orders) ? orders : []).forEach(o => {
        if (o.customerInfo?.phone || o.customerInfo?.email) {
          rows.push(['Website', o.customerInfo?.name || '', o.customerInfo?.phone || '',
            o.customerInfo?.email || '', new Date(o.createdAt).toLocaleDateString('en-EG'),
            o.totalAmount?.toFixed(2) || '', o.paymentMethod || 'COD']);
        }
      });
      (Array.isArray(bazSales) ? bazSales : []).forEach(s => {
        if (s.customerPhone) {
          rows.push(['Bazaar', s.customerName || '', s.customerPhone || '', '',
            new Date(s.createdAt).toLocaleDateString('en-EG'),
            s.totalAmount?.toFixed(2) || '', s.paymentMethod || '']);
        }
      });
      (Array.isArray(reviews) ? reviews : []).forEach(r => {
        if (r.phone || r.email) {
          rows.push(['Review', r.name || '', r.phone || '', r.email || '',
            new Date(r.createdAt).toLocaleDateString('en-EG'), '', '']);
        }
      });

      const csv  = rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url;
      a.download = `siraj-all-customers-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Export failed: ' + e.message); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${CREAM}`, borderTopColor: ROSE,
        borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: MID, fontSize: 13, fontFamily: 'Montserrat, sans-serif' }}>Loading analytics...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const maxPerfRev = productPerf[0]?.revenue || 1;
  const maxBazRev  = bazaarProducts[0]?.revenue || 1;
  const maxDomRev  = Math.max(...dayOfMonthStats.map(d => d.revenue), 1);
  const maxLocRev  = locationStats[0]?.revenue || 1;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', color: DARK, paddingBottom: 40 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, margin: 0, color: DARK }}>
            📊 Analytics
          </h1>
          <p style={{ fontSize: 12, color: MID, marginTop: 3 }}>Full picture — website orders + bazaar events + reviews</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportAllCustomers} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: CREAM, border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: ROSE, fontFamily: 'Montserrat, sans-serif',
          }}>
            <Download size={14} /> Export All Customers
          </button>
          <button onClick={fetchAll} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            background: '#fff', border: `1px solid ${CREAM}`, borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: MID, fontFamily: 'Montserrat, sans-serif',
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
        {[
          ['overview',  '📈 Overview'],
          ['products',  '🕯️ Products'],
          ['bazaar',    '🎪 Bazaar'],
          ['reviews',   '⭐ Reviews'],
          ['customers', '👥 Customers'],
        ].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12, fontFamily: 'Montserrat, sans-serif',
            background: activeTab === tab ? `linear-gradient(135deg, ${ROSE}, #9d174d)` : CREAM,
            color: activeTab === tab ? '#fff' : MID,
            boxShadow: activeTab === tab ? '0 4px 12px rgba(190,24,93,0.2)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Top KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            {[
              { label: 'Total Revenue', value: fmt(overview?.totalRevenue), sub: 'All channels combined', icon: DollarSign, col: '#059669', bg: '#d1fae5' },
              { label: 'Web Orders',    value: fmt(overview?.webRevenue),   sub: `${overview?.totalOrders || 0} orders`, icon: ShoppingBag, col: ROSE, bg: CREAM },
              { label: 'Bazaar Sales',  value: fmt(overview?.bazaarRevenue),sub: 'In-person events',  icon: Package,   col: MID, bg: PALE },
              { label: 'Total Products',value: overview?.totalProducts || 0,sub: 'Active in store',   icon: Package,   col: '#7C3AED', bg: '#ede9fe' },
              { label: 'Customers',     value: overview?.totalCustomers || 0, sub: 'Unique buyers',   icon: Users,     col: '#0891b2', bg: '#cffafe' },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <Card key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 11, color: MID, margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: c.col, margin: 0 }}>{c.value}</p>
                      <p style={{ fontSize: 10, color: MID, marginTop: 3 }}>{c.sub}</p>
                    </div>
                    <div style={{ background: c.bg, borderRadius: 10, padding: 10 }}>
                      <Icon size={20} color={c.col} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Revenue split (web vs bazaar) */}
          <Card>
            <SectionTitle>Revenue Split</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
              {[
                { label: 'Website Orders', value: overview?.webRevenue || 0, color: ROSE },
                { label: 'Bazaar / Events', value: overview?.bazaarRevenue || 0, color: MID },
              ].map((item, i) => {
                const total = (overview?.webRevenue || 0) + (overview?.bazaarRevenue || 0);
                const pct   = total ? (item.value / total * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{item.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{fmtPct(pct)}</span>
                    </div>
                    <MiniBar value={item.value} max={Math.max(overview?.webRevenue || 0, overview?.bazaarRevenue || 0)} color={item.color} />
                    <p style={{ fontSize: 11, color: MID, marginTop: 4 }}>{fmtDec(item.value)}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Payment split */}
          <Card>
            <SectionTitle>Payment Methods (Bazaar)" sub="Cash vs InstaPay across all events" /</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: '💵 Cash', value: overview?.cashVault || 0, color: '#059669', bg: '#d1fae5' },
                { label: '📱 InstaPay', value: overview?.instapayVault || 0, color: '#7C3AED', bg: '#ede9fe' },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: item.color, margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: item.color, margin: 0 }}>{fmt(item.value)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent web orders */}
          <Card>
            <SectionTitle>Recent Website Orders" /</SectionTitle>

            {recentOrders.length === 0 ? (
              <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No orders yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${CREAM}` }}>
                      {['Order ID', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: MID, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o._id} style={{ borderBottom: `1px solid ${PALE}` }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: DARK }}>#{o._id?.slice(-6)}</td>
                        <td style={{ padding: '10px', color: MID }}>{o.customerInfo?.name || 'Guest'}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: ROSE }}>{fmt(o.totalAmount)}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                            background: o.status === 'Delivered' ? '#d1fae5' : o.status === 'Processing' ? CREAM : PALE,
                            color: o.status === 'Delivered' ? '#059669' : o.status === 'Processing' ? ROSE : MID,
                          }}>{o.status || 'Pending'}</span>
                        </td>
                        <td style={{ padding: '10px', color: MID }}>{new Date(o.createdAt).toLocaleDateString('en-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCTS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Top selling products */}
          <Card>
            <SectionTitle children="🏆 Top Selling Products" sub="Combined web + bazaar revenue" />
            {productPerf.length === 0 ? (
              <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No sales data yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {productPerf.slice(0, 15).map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? ROSE : LIGHT, minWidth: 22, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ROSE }}>{fmt(p.revenue)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <MiniBar value={p.revenue} max={maxPerfRev} color={i < 3 ? ROSE : LIGHT} />
                      </div>
                      <p style={{ fontSize: 10, color: MID, margin: '2px 0 0' }}>
                        {p.qty} units sold
                        {p.lastSold ? ` · Last sold ${Math.floor((new Date() - new Date(p.lastSold)) / (1000 * 60 * 60 * 24))}d ago` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Slow movers / dead stock */}
          <Card style={{ border: slowMovers.length > 0 ? `1px solid #fecaca` : `1px solid ${CREAM}` }}>
            <SectionTitle children="⚠️ Slow Movers & Dead Stock" sub="Active products with no sale or no sale in 30+ days" />
            {slowMovers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#059669' }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>✅ All products are selling well!</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${CREAM}` }}>
                      {['Product', 'Price', 'Stock', 'Total Sold', 'Last Sale', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: MID, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slowMovers.map((p, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${PALE}` }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: DARK }}>{p.name}</td>
                        <td style={{ padding: '10px', color: MID }}>{fmt(p.price)}</td>
                        <td style={{ padding: '10px', color: DARK }}>{p.stock}</td>
                        <td style={{ padding: '10px', color: MID }}>{p.totalQty} units</td>
                        <td style={{ padding: '10px', color: MID }}>
                          {p.lastSold ? `${p.daysSince}d ago` : '—'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                            background: p.neverSold ? '#fee2e2' : '#fff3cd',
                            color: p.neverSold ? '#991b1b' : '#92400e',
                          }}>
                            {p.neverSold ? '🔴 Never Sold' : `⚠️ ${p.daysSince}d idle`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BAZAAR TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'bazaar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Event performance */}
          <Card>
            <SectionTitle children="🎪 Event Performance" sub="Revenue and breakdown by event" />
            {bazaarEvents.length === 0 ? (
              <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No bazaar sales recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bazaarEvents.map((ev, i) => (
                  <div key={i} style={{ border: `1px solid ${CREAM}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', background: '#fafafa' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: DARK }}>{ev.eventName}</p>
                        <p style={{ fontSize: 11, color: MID, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {ev.eventLocation && <><MapPin size={10} /> {ev.eventLocation} · </>}
                          {ev.days} day{ev.days !== 1 ? 's' : ''} · {ev.saleCount} sales
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: ROSE }}>{fmt(ev.revenue)}</span>
                        {expandedEvent === i ? <ChevronUp size={16} color={MID} /> : <ChevronDown size={16} color={MID} />}
                      </div>
                    </div>
                    {expandedEvent === i && (
                      <div style={{ padding: '14px 16px', borderTop: `1px solid ${CREAM}`, background: PALE }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                          {[
                            { label: '💵 Cash',        value: fmt(ev.cash) },
                            { label: '📱 InstaPay',    value: fmt(ev.instapay) },
                            { label: '🎁 Free Gifts',  value: `${ev.gifts} items` },
                            { label: '🏷️ Discounts Given', value: fmt(ev.discounts) },
                            { label: '🧾 Avg Sale',    value: ev.saleCount ? fmt(ev.revenue / ev.saleCount) : '—' },
                          ].map((item, j) => (
                            <div key={j} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: `1px solid ${CREAM}` }}>
                              <p style={{ fontSize: 10, color: MID, margin: '0 0 3px', fontWeight: 600 }}>{item.label}</p>
                              <p style={{ fontSize: 14, fontWeight: 800, color: DARK, margin: 0 }}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Bazaar product ranking */}
          <Card>
            <SectionTitle children="🕯️ Best-Selling Products at Bazaars" sub="What sells best in person" />
            {bazaarProducts.length === 0 ? (
              <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No bazaar product data yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bazaarProducts.slice(0, 12).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? ROSE : LIGHT, minWidth: 22, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ROSE }}>{fmt(p.revenue)}</span>
                      </div>
                      <MiniBar value={p.revenue} max={maxBazRev} color={i < 3 ? ROSE : LIGHT} />
                      <p style={{ fontSize: 10, color: MID, margin: '2px 0 0' }}>
                        {p.qty} units sold{p.gifts > 0 ? ` · ${p.gifts} gifted` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Day of month performance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card>
              <SectionTitle children="📅 Best Days of Month" sub="When does bazaar perform best?" />
              {dayOfMonthStats.length === 0 ? (
                <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No data yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayOfMonthStats.sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((d, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>Day {d.day} of month</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ROSE }}>{fmt(d.revenue)}</span>
                      </div>
                      <MiniBar value={d.revenue} max={maxDomRev} />
                      <p style={{ fontSize: 10, color: MID, margin: '1px 0 0' }}>{d.sales} sales</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle children="📍 Location Performance" sub="Which venues work best?" />
              {locationStats.length === 0 ? (
                <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No location data yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {locationStats.map((l, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{l.location}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ROSE }}>{fmt(l.revenue)}</span>
                      </div>
                      <MiniBar value={l.revenue} max={maxLocRev} />
                      <p style={{ fontSize: 10, color: MID, margin: '1px 0 0' }}>{l.sales} sales</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REVIEWS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reviews' && reviewStats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { label: 'Total Reviews',  value: reviewStats.total, color: ROSE, bg: CREAM },
              { label: 'Avg Rating',     value: `${reviewStats.avgRating.toFixed(1)} ⭐`, color: '#d97706', bg: '#fef3c7' },
              { label: 'Products Rated', value: reviewStats.byProduct.length, color: MID, bg: PALE },
              { label: 'Low Rated (< 3.5)', value: reviewStats.lowRated.length, color: '#dc2626', bg: '#fee2e2' },
            ].map((c, i) => (
              <Card key={i} style={{ border: `1px solid ${c.bg}` }}>
                <p style={{ fontSize: 11, color: MID, margin: '0 0 6px', fontWeight: 600 }}>{c.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: c.color, margin: 0 }}>{c.value}</p>
              </Card>
            ))}
          </div>

          {/* Star distribution */}
          <Card>
            <SectionTitle children="⭐ Rating Breakdown" />
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviewStats.byProduct.reduce((s, p) => {
                // Approximate: count reviews with this rating
                return s;
              }, 0);
              return null;
            })}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reviewStats.byProduct.length === 0 ? (
                <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No reviews yet.</p>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: MID, marginBottom: 8 }}>
                    Overall average: <strong style={{ color: ROSE }}>{reviewStats.avgRating.toFixed(1)} / 5</strong> across {reviewStats.total} reviews
                  </p>
                </>
              )}
            </div>
          </Card>

          {/* Most reviewed products */}
          <Card>
            <SectionTitle children="🏆 Most Reviewed Products" />
            {reviewStats.byProduct.length === 0 ? (
              <p style={{ color: MID, fontSize: 13, fontStyle: 'italic' }}>No reviews yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviewStats.byProduct.slice(0, 10).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? ROSE : LIGHT, minWidth: 22, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>{'⭐'.repeat(Math.round(p.avg))} {p.avg.toFixed(1)}</span>
                      </div>
                      <p style={{ fontSize: 10, color: MID, margin: 0 }}>{p.count} review{p.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Low rated — needs attention */}
          {reviewStats.lowRated.length > 0 && (
            <Card style={{ border: '1px solid #fecaca' }}>
              <SectionTitle children="🚨 Needs Attention — Low Ratings" sub="Products averaging below 3.5 stars (2+ reviews)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reviewStats.lowRated.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fee2e2', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{p.avg.toFixed(1)} ⭐ ({p.count} reviews)</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CUSTOMERS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <SectionTitle children="👥 Customer Data & Export" sub="All customers from website orders, bazaar sales, and reviews" />
            <p style={{ fontSize: 13, color: MID, lineHeight: 1.6, marginBottom: 16 }}>
              Export a CSV file containing all customer contact info collected across your website orders, 
              bazaar events, and review submissions. You can open this in Excel or upload to WhatsApp Business 
              to send bulk messages.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={exportAllCustomers} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px',
                background: `linear-gradient(135deg, ${ROSE}, #9d174d)`,
                color: '#fff', border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                boxShadow: '0 4px 12px rgba(190,24,93,0.3)',
              }}>
                <Download size={16} /> Export All Customers (CSV)
              </button>
            </div>
            <div style={{ marginTop: 20, padding: 16, background: PALE, borderRadius: 10, border: `1px solid ${CREAM}` }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: DARK, margin: '0 0 8px' }}>📱 How to send WhatsApp broadcast:</p>
              <ol style={{ fontSize: 12, color: MID, lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                <li>Export the CSV file above</li>
                <li>Open in Excel or Google Sheets</li>
                <li>Copy the phone numbers column</li>
                <li>In WhatsApp Business → New Broadcast → paste numbers</li>
                <li>Or use a service like WA.me or Twilio for bulk sending</li>
              </ol>
            </div>
          </Card>

          {/* Customer stats summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: 'Web Customers', value: overview?.totalCustomers || 0, sub: 'Unique emails from orders', col: ROSE, bg: CREAM },
              { label: 'Avg Orders/Customer', value: overview?.totalCustomers ? ((overview.totalOrders || 0) / overview.totalCustomers).toFixed(1) : '0', sub: 'Repeat purchase rate', col: MID, bg: PALE },
            ].map((c, i) => (
              <Card key={i}>
                <p style={{ fontSize: 11, color: MID, margin: '0 0 6px', fontWeight: 600 }}>{c.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: c.col, margin: 0 }}>{c.value}</p>
                <p style={{ fontSize: 10, color: MID, marginTop: 3 }}>{c.sub}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}