import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, Gift, Tag, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';

const API = 'https://siraj-backend.onrender.com';
const DAYS = ['Day 1', 'Day 2', 'Day 3'];

// ── Design tokens matching the original Admin Dashboard ──────────────────────
const DARK    = '#1E1023';
const PINK    = '#F472B6';
const ROSE    = '#BE185D';
const PALE    = '#FFF0F6';
const MID     = '#6B4A6E';
const LIGHT   = '#D8B4D8';
const CREAM   = '#FCE7F3';

const fmt = (n) => `${(+n || 0).toFixed(2)} EGP`;

const dayColors = {
  'Day 1': ROSE, 
  'Day 2': MID, 
  'Day 3': DARK
};

export default function BazaarPOS() {
  const token = localStorage.getItem('adminToken');

  // ── Product Catalog States ──────────────────────────────────────────────────
  const [products, setProducts]     = useState([]);
  const [search, setSearch]         = useState('');
  const [loadingProd, setLoadingProd] = useState(true);

  // ── Current Cart States ─────────────────────────────────────────────────────
  const [cart, setCart]             = useState([]);
  const [customer, setCustomer]     = useState({ name: '', phone: '' });
  const [discountPct, setDiscountPct] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderNote, setOrderNote]   = useState('');
  const [currentDay, setCurrentDay] = useState('Day 1');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');

  // ── Sales Log States ────────────────────────────────────────────────────────
  const [sales, setSales]           = useState([]);
  const [filterDay, setFilterDay]   = useState('All');
  const [loadingSales, setLoadingSales] = useState(true);
  const [expandedSale, setExpandedSale] = useState(null);
  const [view, setView]             = useState('pos'); // 'pos' | 'log'

  // ── Fetch Catalog Products ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/products?limit=500&status=Active`)
      .then(r => r.json())
      .then(d => setProducts(d.results || []))
      .catch(console.error)
      .finally(() => setLoadingProd(false));
  }, []);

  // ── Fetch Bazaar Sales Log ──────────────────────────────────────────────────
  const fetchSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const url = filterDay === 'All' ? `${API}/api/bazaar` : `${API}/api/bazaar?day=${encodeURIComponent(filterDay)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      setSales(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoadingSales(false); }
  }, [filterDay, token]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  // ── Search Filtering ────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const name = (p.name_en || p.bundleName || p.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // ── Add Item to Cart ────────────────────────────────────────────────────────
  const addToCart = (product, variantName = '') => {
    const price = variantName
      ? (product.variants?.find(v => v.variantName === variantName)?.price ?? product.price_egp)
      : product.price_egp;

    const key = `${product._id}__${variantName}`;
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        key,
        productId: product._id,
        productName: product.name_en || product.bundleName || product.name,
        variantName,
        originalPrice: price,
        salePrice: price,
        quantity: 1,
        isFreeGift: false,
        itemNote: '',
        imageUrl: product.imagePaths?.[0] || '',
        hasVariants: (product.variants?.length > 0),
        variants: product.variants || [],
        scentOptions: product.scentOptions || '',
      }];
    });
  };

  const updateItem = (key, field, value) => {
    setCart(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const removeItem = (key) => setCart(prev => prev.filter(i => i.key !== key));

  // ── Financial Breakdown Deductions ──────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + (i.isFreeGift ? 0 : i.salePrice * i.quantity), 0);
  const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const total          = Math.max(0, subtotal - discountAmount);

  // ── Save/Post Completed Sale ────────────────────────────────────────────────
  const completeSale = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${API}/api/bazaar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: customer.name || 'Walk-in',
          customerPhone: customer.phone,
          items: cart.map(i => ({
            productId: i.productId,
            productName: i.productName,
            variantName: i.variantName,
            originalPrice: i.originalPrice,
            salePrice: i.salePrice,
            quantity: i.quantity,
            isFreeGift: i.isFreeGift,
            itemNote: i.itemNote,
          })),
          orderDiscount: discountAmount,
          discountPct: discountPct,
          paymentMethod,
          note: orderNote,
          bazaarDay: currentDay,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSaveMsg('✅ Sale saved successfully!');
      setCart([]);
      setCustomer({ name: '', phone: '' });
      setDiscountPct(0);
      setPaymentMethod('Cash');
      setOrderNote('');
      fetchSales();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Recorded Sale ────────────────────────────────────────────────────
  const deleteSale = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale? Stock metrics will not be restored.')) return;
    await fetch(`${API}/api/bazaar/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchSales();
  };

  // ── Log Calculations ────────────────────────────────────────────────────────
  const daySales = (day) => sales.filter(s => day === 'All' || s.bazaarDay === day);
  const dayRevenue = (day) => daySales(day).reduce((s, o) => s + o.totalAmount, 0);
  const dayCount   = (day) => daySales(day).length;

  return (
    <div className="admin-root" style={{ fontFamily: 'Montserrat, sans-serif', color: DARK }}>

      {/* ── View Header Controls ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, margin: 0, color: DARK }}>🎪 Bazaar POS System</h1>
          <p style={{ fontSize: '0.82rem', color: MID, marginTop: 2, fontStyle: 'italic' }}>Record floor sales cleanly • Warehouse inventory automatically shifts</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'pos', label: '🛒 New Terminal Sale' },
            { id: 'log', label: '📋 View Sales Logs' }
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              fontFamily: 'Montserrat, sans-serif',
              background: view === v.id ? `linear-gradient(135deg, ${ROSE}, #9d174d)` : CREAM, 
              color: view === v.id ? '#fff' : MID,
              boxShadow: view === v.id ? `0 4px 12px rgba(190,24,93,0.25)` : 'none',
              transition: 'all 0.2s ease'
            }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Session Day Selector ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Session:
        </span>
        {DAYS.map(d => (
          <button key={d} onClick={() => setCurrentDay(d)} style={{
            padding: '6px 16px', borderRadius: 20, border: '2px solid',
            borderColor: currentDay === d ? dayColors[d] : CREAM,
            background: currentDay === d ? dayColors[d] : '#fff',
            color: currentDay === d ? '#fff' : DARK,
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s'
          }}>{d}</button>
        ))}
      </div>

      {view === 'pos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT PANEL: Live Product Catalog ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, boxShadow: '0 2px 16px rgba(190,24,93,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${CREAM}`, background: '#fafafa' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px 0', color: DARK }}>Stock Selection Catalog</h2>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, color: MID }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search catalog products..."
                  style={{ width: '100%', padding: '10px 12px 10px 38px', border: `1.5px solid ${CREAM}`, borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
              </div>
            </div>

            <div style={{ maxHeight: 600, overflowY: 'auto', padding: 16 }}>
              {loadingProd ? (
                <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>Loading warehouse inventory...</p>
              ) : filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>No brand items match query parameters.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                  {filtered.map(p => {
                    const name = p.name_en || p.bundleName || p.name;
                    const price = p.price_egp;
                    const img = p.imagePaths?.[0];
                    const variants = p.variants || [];
                    const scentOpts = p.scentOptions ? p.scentOptions.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const allOpts = variants.length > 0 ? variants : scentOpts.map(s => ({ variantName: s, price }));

                    return (
                      <div key={p._id} style={{ border: `1px solid ${CREAM}`, borderRadius: 12, overflow: 'hidden', background: '#fff', transition: 'transform 0.2s' }}>
                        {img && <img src={img} alt={name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />}
                        <div style={{ padding: '10px' }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.3, color: DARK, minHeight: 32, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{name}</p>
                          <p style={{ fontSize: 12, color: ROSE, fontWeight: 700, margin: '0 0 8px' }}>{fmt(price)}</p>
                          {allOpts.length > 1 ? (
                            <select onChange={e => { if (e.target.value) addToCart(p, e.target.value); e.target.value = ''; }}
                              style={{ width: '100%', fontSize: 11, padding: '6px', border: `1px solid ${CREAM}`, borderRadius: 8, outline: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', background: PALE, color: MID, fontWeight: 600 }}
                              defaultValue="">
                              <option value="">Choose Scent →</option>
                              {allOpts.map((v, i) => (
                                <option key={i} value={v.variantName}>{v.variantName}{v.price !== price ? ` (${fmt(v.price)})` : ''}</option>
                              ))}
                            </select>
                          ) : (
                            <button onClick={() => addToCart(p, allOpts[0]?.variantName || '')}
                              style={{ width: '100%', padding: '6px 0', background: `linear-gradient(135deg, ${PINK}, ${ROSE})`, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                              + Add To Cart
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Transaction Terminal Checkout ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, boxShadow: '0 2px 16px rgba(190,24,93,0.04)', padding: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: 16, color: DARK, borderBottom: `1px solid ${CREAM}`, paddingBottom: 8 }}>🛒 Active Terminal Cart</h2>

            {/* Customer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
                placeholder="Client Name"
                style={{ padding: '10px', border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
              <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
                placeholder="Phone Assignment"
                style={{ padding: '10px', border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
            </div>

            {/* Cart Items Wrapper */}
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: MID }}>
                <ShoppingBag style={{ width: 36, height: 36, margin: '0 auto 10px', display: 'block', color: LIGHT }} />
                <p style={{ fontSize: 13, fontStyle: 'italic' }}>Terminal stock selection is empty.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 14, paddingRight: 4 }}>
                {cart.map(item => (
                  <div key={item.key} style={{ borderBottom: `1px solid ${PALE}`, paddingBottom: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: DARK }}>{item.productName}</p>
                        {item.variantName && <p style={{ fontSize: 11, color: MID, margin: 0, fontWeight: 500 }}>{item.variantName}</p>}
                      </div>
                      <button onClick={() => removeItem(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ROSE, padding: 2 }}>
                        <X style={{ width: 16 }} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Quantity Config */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${CREAM}`, borderRadius: 8, padding: '4px 8px', background: PALE }}>
                        <button onClick={() => updateItem(item.key, 'quantity', Math.max(1, item.quantity - 1))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: MID }}>
                          <Minus style={{ width: 12 }} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 22, textAlign: 'center', color: DARK }}>{item.quantity}</span>
                        <button onClick={() => updateItem(item.key, 'quantity', item.quantity + 1)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: MID }}>
                          <Plus style={{ width: 12 }} />
                        </button>
                      </div>

                      {/* Line Override Price */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag style={{ width: 12, color: MID }} />
                        <input type="number" value={item.salePrice} disabled={item.isFreeGift}
                          onChange={e => updateItem(item.key, 'salePrice', parseFloat(e.target.value) || 0)}
                          style={{ width: 65, padding: '5px 8px', border: `1px solid ${CREAM}`, borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif', opacity: item.isFreeGift ? 0.4 : 1 }} />
                        <span style={{ fontSize: 11, color: MID, fontWeight: 500 }}>EGP</span>
                      </div>

                      {/* Complimentary Free Gift Trigger */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: item.isFreeGift ? ROSE : MID, fontWeight: 600 }}>
                        <input type="checkbox" checked={item.isFreeGift}
                          onChange={e => updateItem(item.key, 'isFreeGift', e.target.checked)}
                          style={{ width: 14, height: 14, accentColor: ROSE }} />
                        <Gift style={{ width: 12 }} /> Gift
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                      <span style={{ color: MID, fontStyle: 'italic' }}>
                        {item.isFreeGift ? '🎁 Free promotional asset' : `${item.quantity} × ${fmt(item.salePrice)}`}
                      </span>
                      <span style={{ fontWeight: 700, color: item.isFreeGift ? ROSE : DARK }}>
                        {item.isFreeGift ? 'COMPLIMENTARY' : fmt(item.salePrice * item.quantity)}
                      </span>
                    </div>

                    <input value={item.itemNote} onChange={e => updateItem(item.key, 'itemNote', e.target.value)}
                      placeholder="Item modification notes..."
                      style={{ marginTop: 8, width: '100%', padding: '6px 10px', border: `1px solid ${CREAM}`, borderRadius: 6, fontSize: 11, boxSizing: 'border-box', color: DARK, outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Campaign/Order Discounts Percentage Selector */}
            {cart.length > 0 && (
              <div style={{ marginBottom: 16, borderTop: `1px solid ${PALE}`, paddingTop: 12 }}>
                <label style={{ fontSize: 12, color: MID, display: 'block', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Transaction Discount Scope
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[0, 5, 10, 15, 20, 25, 30].map(pct => (
                    <button key={pct} onClick={() => setDiscountPct(pct)}
                      style={{
                        padding: '6px 12px', borderRadius: 20, border: '2px solid',
                        borderColor: discountPct === pct ? ROSE : CREAM,
                        background: discountPct === pct ? CREAM : '#fff',
                        color: discountPct === pct ? ROSE : DARK,
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700, fontSize: 11, cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                      {pct === 0 ? 'No Discount' : `${pct}% Off`}
                    </button>
                  ))}
                </div>
                {discountPct > 0 && (
                  <p style={{ fontSize: 12, color: ROSE, marginTop: 8, fontWeight: 600 }}>
                    Deducting {fmt(discountAmount)} ({discountPct}% sequential reduction applied)
                  </p>
                )}
              </div>
            )}

            {/* Cash vs InstaPay Reconciliation Selector */}
            {cart.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: MID, display: 'block', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Accountant Payment Method
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Cash', 'InstaPay'].map(method => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button key={method} type="button" onClick={() => setPaymentMethod(method)}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, border: '2px solid',
                          borderColor: isSelected ? ROSE : CREAM,
                          background: isSelected ? CREAM : '#fff',
                          color: isSelected ? ROSE : DARK,
                          fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}>
                        {method === 'Cash' ? '💵 Physical Cash' : '📱 InstaPay Transfer'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Floor Note Assignment */}
            {cart.length > 0 && (
              <input value={orderNote} onChange={e => setOrderNote(e.target.value)}
                placeholder="General invoice ledger note (optional)..."
                style={{ width: '100%', padding: '10px', border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12, marginBottom: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
            )}

            {/* Financial Ledger Calculation Card */}
            {cart.length > 0 && (
              <div style={{ background: PALE, border: `1px solid ${CREAM}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: 13, marginBottom: 6, color: MID }}>
                  <span>Gross Basket Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
                </div>
                {discountPct > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: ROSE, fontWeight: 600 }}>
                    <span>Basket Reduction ({discountPct}%)</span>
                    <span>- {fmt(discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${CREAM}`, color: DARK }}>
                  <span>Net Collection Due</span>
                  <span style={{ color: ROSE }}>{fmt(total)}</span>
                </div>
              </div>
            )}

            {saveMsg && (
              <div style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600, textAlignment: 'center',
                background: saveMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                color: saveMsg.startsWith('✅') ? '#166534' : '#991b1b',
                border: saveMsg.startsWith('✅') ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                {saveMsg}
              </div>
            )}

            <button onClick={completeSale} disabled={cart.length === 0 || saving}
              style={{ width: '100%', padding: '14px 0', background: cart.length === 0 ? '#e5e7eb' : `linear-gradient(135deg, ${ROSE}, #9d174d)`,
                color: cart.length === 0 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 12,
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 14, fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: cart.length === 0 ? 'none' : '0 4px 14px rgba(190,24,93,0.3)', transition: 'all 0.2s' }}>
              {saving ? '⏳ Registering Assets...' : `Process Settlement — ${fmt(total)}`}
            </button>
          </div>
        </div>

      ) : (
        /* ── CENTRAL LEDGER SALES LOG VIEW ── */
        <div>
          {/* Calendar Session Revenue Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            {['All', ...DAYS].map(d => (
              <div key={d} style={{ background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 2px 12px rgba(190,24,93,0.02)',
                border: `2px solid ${filterDay === d ? (dayColors[d] || ROSE) : CREAM}`,
                cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setFilterDay(d)}>
                <p style={{ fontSize: 11, color: MID, margin: '0 0 6px 0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d === 'All' ? 'Overall Total' : `${d} Metrics`}</p>
                <p style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px 0', color: dayColors[d] || ROSE }}>{fmt(dayRevenue(d))}</p>
                <p style={{ fontSize: 12, color: DARK, fontWeight: 500, margin: 0 }}>{dayCount(d)} finalized sales</p>
              </div>
            ))}
          </div>

          {/* Sync Trigger */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={fetchSales} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16.5px', background: '#fff', border: `1px solid ${CREAM}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: MID }}>
              <RefreshCw style={{ width: 14 }} /> Synchronize Log
            </button>
          </div>

          {loadingSales ? (
            <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>Querying financial logs...</p>
          ) : sales.length === 0 ? (
            <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>No registered terminal transformations found for this interval.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {daySales(filterDay).map(sale => (
                <div key={sale._id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${CREAM}`, boxShadow: '0 2px 8px rgba(190,24,93,0.02)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}
                    onClick={() => setExpandedSale(expandedSale === sale._id ? null : sale._id)}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700,
                        background: (dayColors[sale.bazaarDay] || ROSE) + '15', color: dayColors[sale.bazaarDay] || ROSE }}>
                        {sale.bazaarDay}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: DARK }}>{sale.customerName}</p>
                        <p style={{ fontSize: 11, color: MID, margin: 0, fontWeight: 500 }}>
                          {sale.customerPhone || 'Walk-In Unassigned'} · {new Date(sale.createdAt).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: ROSE }}>{fmt(sale.totalAmount)}</span>
                      {expandedSale === sale._id ? <ChevronUp style={{ width: 18, color: MID }} /> : <ChevronDown style={{ width: 18, color: MID }} />}
                    </div>
                  </div>

                  {/* Accordion Expanded Account Audit View */}
                  {expandedSale === sale._id && (
                    <div style={{ borderTop: `1px solid ${CREAM}`, padding: '16px 20px', background: PALE }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Settled Items Breakdown</p>
                      {sale.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: `1px solid ${CREAM}` }}>
                          <span style={{ color: DARK, fontWeight: 500 }}>
                            {item.isFreeGift && '🎁 '}{item.productName}
                            {item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
                            {item.itemNote ? <em style={{ color: MID, marginLeft: 8 }}> — {item.itemNote}</em> : ''}
                          </span>
                          <span style={{ fontWeight: 700, color: item.isFreeGift ? ROSE : DARK }}>
                            {item.isFreeGift ? 'FREE' : fmt(item.salePrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: MID }}>
                        <span>Subtotal Ledger</span><span>{fmt(sale.subtotal)}</span>
                      </div>
                      {sale.orderDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: ROSE, fontWeight: 500 }}>
                          <span>Manual Reduction ({sale.discountPct || 0}%)</span><span>- {fmt(sale.orderDiscount)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${CREAM}`, color: DARK }}>
                        <span>Net Collection Total</span><span>{fmt(sale.totalAmount)}</span>
                      </div>

                      {/* Explicit Payment Route Declaration for Accountant Audits */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${LIGHT}` }}>
                        <span style={{ color: MID, fontWeight: 600 }}>Ledger Audit Classification</span>
                        <span style={{ fontWeight: 700, color: DARK }}>
                          {sale.paymentMethod === 'InstaPay' ? '📱 InstaPay Transfer Routing' : '💵 Cash Reconciled Vault'}
                        </span>
                      </div>

                      {sale.note && <p style={{ fontSize: 11, color: MID, marginTop: 10, fontStyle: 'italic' }}><strong>Invoice Memo:</strong> {sale.note}</p>}
                      
                      <button onClick={() => deleteSale(sale._id)}
                        style={{ marginTop: 14, padding: '6px 14px', background: '#fff', color: ROSE, border: `1px solid ${ROSE}`, borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', transition: 'all 0.2s' }}>
                        🗑️ Strike Action Invoice
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}