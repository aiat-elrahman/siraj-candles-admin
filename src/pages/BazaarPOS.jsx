import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, Gift, Tag, RefreshCw, ChevronDown, ChevronUp, X, Check, Layers } from 'lucide-react';

const API = 'https://siraj-backend.onrender.com';
const DAYS = ['Day 1', 'Day 2', 'Day 3'];

// ── Shared Branding Design Tokens ────────────────────────────────────────────
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

  // ── Dynamic Bundle Configurator States ──────────────────────────────────────
  const [configProduct, setConfigProduct] = useState(null);
  const [bundleSelections, setBundleSelections] = useState({}); // Track index -> chosen option

  // ── Sales Log / View Navigation States ──────────────────────────────────────
  const [sales, setSales]           = useState([]);
  const [filterDay, setFilterDay]   = useState('All');
  const [loadingSales, setLoadingSales] = useState(true);
  const [expandedSale, setExpandedSale] = useState(null);
  
  // High-performance layouts: 'pos-catalog' | 'pos-cart' | 'log'
  const [activeView, setActiveView] = useState('pos-catalog'); 

  // ── Data Ingestion ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/products?limit=500&status=Active`)
      .then(r => r.json())
      .then(d => setProducts(d.results || []))
      .catch(console.error)
      .finally(() => setLoadingProd(false));
  }, []);

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

  const filtered = products.filter(p => {
    const name = (p.name_en || p.bundleName || p.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // ── Trigger Item Routing Logic ──────────────────────────────────────────────
  const handleItemAddition = (product) => {
    const isBundle = product.productType === 'Bundle' || (product.bundleItems && product.bundleItems.length > 0);
    
    if (isBundle) {
      // Open bundle customization matrix modal
      const initialSelections = {};
      (product.bundleItems || []).forEach((item, idx) => {
        const scents = Array.isArray(item.allowedScents) 
          ? item.allowedScents 
          : (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean);
        initialSelections[idx] = scents[0] || 'Standard';
      });
      setBundleSelections(initialSelections);
      setConfigProduct(product);
    } else {
      // Standard product quick addition
      executeAddToCart(product, '');
    }
  };

  // ── Core Cart Execution Pipeline ────────────────────────────────────────────
  const executeAddToCart = (product, variantLabel = '') => {
    const price = product.price_egp || product.bundlePrice || product.price || 0;
    const key = `${product._id}__${variantLabel}`;

    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        key,
        productId: product._id,
        productName: product.name_en || product.bundleName || product.name,
        variantName: variantLabel,
        originalPrice: price,
        salePrice: price,
        quantity: 1,
        isFreeGift: false,
        itemNote: '',
        imageUrl: product.imagePaths?.[0] || '',
      }];
    });
  };

  const finalizeBundleConfiguration = () => {
    if (!configProduct) return;
    
    // Form custom summary string: "Item A (Scent) + Item B (Scent)"
    const summaryParts = (configProduct.bundleItems || []).map((item, idx) => {
      return `${item.subProductName}: ${bundleSelections[idx] || 'Default'}`;
    });
    
    const configuredVariantLabel = summaryParts.join(' | ');
    executeAddToCart(configProduct, configuredVariantLabel);
    
    setConfigProduct(null);
    setBundleSelections({});
  };

  const updateItem = (key, field, value) => {
    setCart(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const removeItem = (key) => setCart(prev => prev.filter(i => i.key !== key));

  // ── Financial Breakdown Pipeline ────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + (i.isFreeGift ? 0 : i.salePrice * i.quantity), 0);
  const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const total          = Math.max(0, subtotal - discountAmount);

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

  const deleteSale = async (id) => {
    if (!window.confirm('Delete this sale permanently? Inventory numbers will not be modified.')) return;
    await fetch(`${API}/api/bazaar/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchSales();
  };

  const daySales = (day) => sales.filter(s => day === 'All' || s.bazaarDay === day);
  const dayRevenue = (day) => daySales(day).reduce((s, o) => s + o.totalAmount, 0);
  const dayCount   = (day) => daySales(day).length;

  return (
    <div className="bazaar-container" style={{ fontFamily: 'Montserrat, sans-serif', color: DARK, paddingBottom: 80 }}>
      
      {/* ── Global View Layout Swapper Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.2rem', fontWeight: 700, margin: 0, color: DARK }}>🎪 Floor Bazaar POS</h1>
          <p style={{ fontSize: '0.82rem', color: MID, marginTop: 2, fontStyle: 'italic' }}>Record floor transactions instantly • Realtime mobile validation</p>
        </div>
        
        {/* Desktop Engine Navigation Tab Selectors */}
        <div className="desktop-view-tabs" style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'pos-catalog', label: '🛒 Register Sales Catalog' },
            { id: 'log', label: '📋  Sales Log' }
          ].map(tab => {
            const isPOSGroup = tab.id === 'pos-catalog' && (activeView === 'pos-catalog' || activeView === 'pos-cart');
            const isActive = activeView === tab.id || isPOSGroup;
            return (
              <button key={tab.id} onClick={() => setActiveView(tab.id)} style={{
                padding: '12px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                fontFamily: 'Montserrat, sans-serif',
                background: isActive ? `linear-gradient(135deg, ${ROSE}, #9d174d)` : CREAM, 
                color: isActive ? '#fff' : MID,
                boxShadow: isActive ? '0 4px 12px rgba(190,24,93,0.2)' : 'none',
                transition: 'all 0.2s'
              }}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Shift Day Management Strip ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Logging Session:</span>
        {DAYS.map(d => (
          <button key={d} onClick={() => setCurrentDay(d)} style={{
            padding: '6px 16px', borderRadius: 20, border: '2px solid',
            borderColor: currentDay === d ? dayColors[d] : CREAM,
            background: currentDay === d ? dayColors[d] : '#fff',
            color: currentDay === d ? '#fff' : DARK,
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{d}</button>
        ))}
      </div>

      {/* ── POS MATRIX FLOWS ── */}
      {(activeView === 'pos-catalog' || activeView === 'pos-cart') && (
        <div className="pos-grid-responsive">
          
          {/* CATALOG MATRIX PANEL */}
          <div className={`catalog-panel ${activeView === 'pos-cart' ? 'mobile-hide' : ''}`} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, boxShadow: '0 2px 16px rgba(190,24,93,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${CREAM}`, background: '#fafafa' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, color: MID }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Scan or lookup products/bundles..."
                  style={{ width: '100%', padding: '12px 12px 12px 40px', border: `1.5px solid ${CREAM}`, borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
              </div>
            </div>

            <div style={{ maxHeight: 600, overflowY: 'auto', padding: 16 }}>
              {loadingProd ? (
                <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>Syncing product database...</p>
              ) : filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>No products match query settings.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  {filtered.map(p => {
                    const isBundle = p.productType === 'Bundle' || (p.bundleItems && p.bundleItems.length > 0);
                    const name = p.name_en || p.bundleName || p.name;
                    const price = p.price_egp || p.bundlePrice || p.price || 0;
                    const img = p.imagePaths?.[0];
                    const variants = p.variants || [];
                    const scentOpts = p.scentOptions ? p.scentOptions.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const allOpts = variants.length > 0 ? variants : scentOpts.map(s => ({ variantName: s, price }));

                    return (
                      <div key={p._id} style={{ border: `1px solid ${CREAM}`, borderRadius: 12, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
                        <div>
                          {img && <img src={img} alt={name} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />}
                          <div style={{ padding: 10 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.3, color: DARK, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}>{name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, color: ROSE, fontWeight: 700 }}>{fmt(price)}</span>
                              {isBundle && <span style={{ fontSize: 10, background: PALE, color: ROSE, padding: '1px 5px', borderRadius: 4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Layers size={10}/>Bundle</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ padding: '0 10px 10px 10px' }}>
                          {isBundle ? (
                            <button onClick={() => handleItemAddition(p)}
                              style={{ width: '100%', padding: '8px 0', background: DARK, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              ⚙️ Configure Bundle
                            </button>
                          ) : allOpts.length > 1 ? (
                            <select onChange={e => { if (e.target.value) executeAddToCart(p, e.target.value); e.target.value = ''; }}
                              style={{ width: '100%', fontSize: 11, padding: '7px 4px', border: `1px solid ${CREAM}`, borderRadius: 8, fontFamily: 'Montserrat, sans-serif', background: PALE, color: MID, fontWeight: 700, outline: 'none' }}
                              defaultValue="">
                              <option value="">Select Option →</option>
                              {allOpts.map((v, i) => (
                                <option key={i} value={v.variantName}>{v.variantName}{v.price !== price ? ` (${fmt(v.price)})` : ''}</option>
                              ))}
                            </select>
                          ) : (
                            <button onClick={() => executeAddToCart(p, allOpts[0]?.variantName || '')}
                              style={{ width: '100%', padding: '8px 0', background: `linear-gradient(135deg, ${PINK}, ${ROSE})`, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                              + Quick Add
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

          {/* CHECKOUT CART PANEL */}
          <div className={`cart-panel ${activeView === 'pos-catalog' ? 'mobile-hide' : ''}`} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, boxShadow: '0 2px 16px rgba(190,24,93,0.04)', padding: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: 14, color: DARK, borderBottom: `1px solid ${CREAM}`, paddingBottom: 6 }}>🛒 Active Ledger Checkout</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
                placeholder="Walk-in Client Name"
                style={{ padding: '10px', border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
              <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
                placeholder="Client Mobile Phone"
                style={{ padding: '10px', border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: MID }}>
                <ShoppingBag style={{ width: 36, height: 36, margin: '0 auto 10px', display: 'block', color: LIGHT }} />
                <p style={{ fontSize: 13, fontStyle: 'italic' }}>Add floor inventory items to launch terminal calculations.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
                {cart.map(item => (
                  <div key={item.key} style={{ borderBottom: `1px solid ${PALE}`, paddingBottom: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: DARK }}>{item.productName}</p>
                        {item.variantName && <p style={{ fontSize: 11, color: ROSE, margin: 0, fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.3 }}>{item.variantName}</p>}
                      </div>
                      <button onClick={() => removeItem(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ROSE, padding: 2 }}>
                        <X style={{ width: 16 }} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${CREAM}`, borderRadius: 8, padding: '3px 6px', background: PALE }}>
                        <button onClick={() => updateItem(item.key, 'quantity', Math.max(1, item.quantity - 1))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: MID }}>
                          <Minus style={{ width: 12 }} />
                        </button>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center', color: DARK }}>{item.quantity}</span>
                        <button onClick={() => updateItem(item.key, 'quantity', item.quantity + 1)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: MID }}>
                          <Plus style={{ width: 12 }} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" value={item.salePrice} disabled={item.isFreeGift}
                          onChange={e => updateItem(item.key, 'salePrice', parseFloat(e.target.value) || 0)}
                          style={{ width: 60, padding: '5px 6px', border: `1px solid ${CREAM}`, borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif', opacity: item.isFreeGift ? 0.4 : 1 }} />
                        <span style={{ fontSize: 11, color: MID }}>EGP</span>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: item.isFreeGift ? ROSE : MID, fontWeight: 600 }}>
                        <input type="checkbox" checked={item.isFreeGift}
                          onChange={e => updateItem(item.key, 'isFreeGift', e.target.checked)}
                          style={{ width: 14, height: 14, accentColor: ROSE }} />
                        <Gift style={{ width: 12 }} /> Gift
                      </label>
                    </div>

                    <input value={item.itemNote} onChange={e => updateItem(item.key, 'itemNote', e.target.value)}
                      placeholder="Add line item customization notes..."
                      style={{ marginTop: 6, width: '100%', padding: '5px 8px', border: `1px solid ${CREAM}`, borderRadius: 6, fontSize: 11, boxSizing: 'border-box', color: DARK, outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Markdown Percentage Engine */}
            {cart.length > 0 && (
              <div style={{ marginBottom: 14, borderTop: `1px solid ${PALE}`, paddingTop: 10 }}>
                <label style={{ fontSize: 11, color: MID, display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Cart Discount Ratio</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[0, 5, 10, 15, 20, 25, 30].map(pct => (
                    <button key={pct} onClick={() => setDiscountPct(pct)}
                      style={{
                        padding: '6px 10px', borderRadius: 20, border: '1px solid',
                        borderColor: discountPct === pct ? ROSE : CREAM,
                        background: discountPct === pct ? CREAM : '#fff',
                        color: discountPct === pct ? ROSE : DARK,
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700, fontSize: 11, cursor: 'pointer'
                      }}>
                      {pct === 0 ? '0%' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reconciliation Payment Framework */}
            {cart.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: MID, display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Accountant Payment Target</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Cash', 'InstaPay'].map(method => (
                    <button key={method} type="button" onClick={() => setPaymentMethod(method)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid',
                        borderColor: paymentMethod === method ? ROSE : CREAM,
                        background: paymentMethod === method ? CREAM : '#fff',
                        color: paymentMethod === method ? ROSE : DARK,
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
                      }}>
                      {method === 'Cash' ? '💵 Physical Cash' : '📱 InstaPay Wire'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <input value={orderNote} onChange={e => setOrderNote(e.target.value)}
                placeholder="Add general receipt comment..."
                style={{ width: '100%', padding: '10px', border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12, marginBottom: 12, boxSizing: 'border-box', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
            )}

            {/* Calculation Readout Card */}
            {cart.length > 0 && (
              <div style={{ background: PALE, borderRadius: 12, padding: '12px 14px', marginBottom: 14, border: `1px solid ${CREAM}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: MID }}>
                  <span>Gross Value</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {discountPct > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: ROSE, fontWeight: 600 }}>
                    <span>Sequential Discount ({discountPct}%)</span>
                    <span>- {fmt(discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${CREAM}`, color: DARK }}>
                  <span>Net Floor Due</span>
                  <span style={{ color: ROSE }}>{fmt(total)}</span>
                </div>
              </div>
            )}

            {saveMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 12, fontWeight: 600,
                background: saveMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                color: saveMsg.startsWith('✅') ? '#166534' : '#991b1b',
                border: saveMsg.startsWith('✅') ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                {saveMsg}
              </div>
            )}

            <button onClick={completeSale} disabled={cart.length === 0 || saving}
              style={{ width: '100%', padding: '14px 0', background: cart.length === 0 ? '#e5e7eb' : `linear-gradient(135deg, ${ROSE}, #9d174d)`,
                color: cart.length === 0 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', boxShadow: cart.length === 0 ? 'none' : '0 4px 12px rgba(190,24,93,0.25)' }}>
              {saving ? '⏳ Archiving Transaction...' : `Finalize Floor Settlement — ${fmt(total)}`}
            </button>
          </div>
        </div>
      )}

      {/* ── ARCHIVE/SALES LOG MODULE ── */}
      {activeView === 'log' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
            {['All', ...DAYS].map(d => (
              <div key={d} style={{ background: '#fff', borderRadius: 12, padding: '14px', boxShadow: '0 2px 12px rgba(190,24,93,0.02)',
                border: `2px solid ${filterDay === d ? (dayColors[d] || ROSE) : CREAM}`,
                cursor: 'pointer' }} onClick={() => setFilterDay(d)}>
                <p style={{ fontSize: 11, color: MID, margin: '0 0 4px 0', fontWeight: 700, textTransform: 'uppercase' }}>{d === 'All' ? 'All Combined' : d}</p>
                <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px 0', color: dayColors[d] || ROSE }}>{fmt(dayRevenue(d))}</p>
                <p style={{ fontSize: 11, color: DARK, margin: 0, fontWeight: 500 }}>{dayCount(d)} invoices</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={fetchSales} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: `1px solid ${CREAM}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: MID, fontFamily: 'Montserrat, sans-serif' }}>
              <RefreshCw style={{ width: 14 }} /> Refresh Log
            </button>
          </div>

          {loadingSales ? (
            <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>Loading database entries...</p>
          ) : sales.length === 0 ? (
            <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>No registered invoices logged for this interval.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {daySales(filterDay).map(sale => (
                <div key={sale._id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${CREAM}`, boxShadow: '0 2px 8px rgba(190,24,93,0.02)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                    onClick={() => setExpandedSale(expandedSale === sale._id ? null : sale._id)}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, fontWeight: 700,
                        background: (dayColors[sale.bazaarDay] || ROSE) + '22', color: dayColors[sale.bazaarDay] || ROSE }}>
                        {sale.bazaarDay}
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: DARK }}>{sale.customerName}</p>
                        <p style={{ fontSize: 11, color: MID, margin: 0 }}>
                          {sale.customerPhone || 'No Phone Link'} · {new Date(sale.createdAt).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: ROSE }}>{fmt(sale.totalAmount)}</span>
                      {expandedSale === sale._id ? <ChevronUp style={{ width: 16, color: MID }} /> : <ChevronDown style={{ width: 16, color: MID }} />}
                    </div>
                  </div>

                  {expandedSale === sale._id && (
                    <div style={{ borderTop: `1px solid ${CREAM}`, padding: '12px 16px', background: PALE }}>
                      {sale.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${CREAM}` }}>
                          <span style={{ color: DARK, fontWeight: 500 }}>
                            {item.isFreeGift && '🎁 '}{item.productName}
                            {item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
                            {item.itemNote ? <em style={{ color: MID }}> — {item.itemNote}</em> : ''}
                          </span>
                          <span style={{ fontWeight: 700, color: item.isFreeGift ? ROSE : DARK }}>
                            {item.isFreeGift ? 'FREE' : fmt(item.salePrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: MID }}>
                        <span>Subtotal</span><span>{fmt(sale.subtotal)}</span>
                      </div>
                      {sale.orderDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: ROSE, fontWeight: 500 }}>
                          <span>Discount Applied ({sale.discountPct || 0}%)</span><span>- {fmt(sale.orderDiscount)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${CREAM}`, color: DARK }}>
                        <span>Total Paid</span><span>{fmt(sale.totalAmount)}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${LIGHT}` }}>
                        <span style={{ color: MID, fontWeight: 600 }}>Accounting Path</span>
                        <span style={{ fontWeight: 700, color: sale.paymentMethod === 'InstaPay' ? '#6366f1' : '#059669' }}>
                          {sale.paymentMethod === 'InstaPay' ? '📱 InstaPay Routing' : '💵 Cash Collected'}
                        </span>
                      </div>

                      {sale.note && <p style={{ fontSize: 11, color: MID, marginTop: 8 }}><strong>Memo Note:</strong> {sale.note}</p>}
                      <button onClick={() => deleteSale(sale._id)}
                        style={{ marginTop: 12, padding: '5px 12px', background: '#fff', color: ROSE, border: `1px solid ${ROSE}`, borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>
                        🗑️ Strike Invoice Record
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INTERACTIVE BUNDLE CONFIGURATOR MODAL OVERLAY ── */}
      {configProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${CREAM}`, paddingBottom: 10 }}>
              <div>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: DARK, margin: 0 }}>Configure Bundle Options</h3>
                <p style={{ fontSize: 11, color: MID, margin: '2px 0 0 0' }}>{configProduct.name_en || configProduct.bundleName}</p>
              </div>
              <button onClick={() => setConfigProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID }}><X size={20} /></button>
            </div>

            {/* Customization Selectors Chain */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {(configProduct.bundleItems || []).map((item, idx) => {
                // Dynamically unpack options string into clickable/selectable buttons
                const scents = Array.isArray(item.allowedScents) 
                  ? item.allowedScents 
                  : (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean);

                return (
                  <div key={idx} style={{ background: PALE, padding: 12, borderRadius: 10, border: `1px solid ${CREAM}` }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: DARK, display: 'block', marginBottom: 6 }}>
                      {item.subProductName} {item.size ? `(${item.size})` : ''}
                    </label>
                    
                    {scents.length <= 4 ? (
                      /* High-Speed Button Layout for small choice loops */
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {scents.map(scent => {
                          const isSelected = bundleSelections[idx] === scent;
                          return (
                            <button key={scent} type="button" onClick={() => setBundleSelections(p => ({ ...p, [idx]: scent }))}
                              style={{
                                padding: '6px 10px', borderRadius: 6, border: '1px solid',
                                borderColor: isSelected ? ROSE : LIGHT,
                                background: isSelected ? ROSE : '#fff',
                                color: isSelected ? '#fff' : DARK,
                                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif'
                              }}>
                              {scent}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback dropdown matrix for deep variance structures */
                      <select value={bundleSelections[idx] || ''} onChange={e => setBundleSelections(p => ({ ...p, [idx]: e.target.value }))}
                        style={{ width: '100%', padding: 8, borderRadius: 6, border: `1.5px solid ${CREAM}`, fontSize: 12, background: '#fff', fontFamily: 'Montserrat, sans-serif', outline: 'none' }}>
                        {scents.map(scent => <option key={scent} value={scent}>{scent}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={finalizeBundleConfiguration}
              style={{ width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${PINK}, ${ROSE})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={16}/> Confirm Bundle Selection
            </button>
          </div>
        </div>
      )}

      {/* ── SMARTPHONE FLOATING NAV STICKY BAR ── */}
      <div className="mobile-action-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: DARK, display: 'none', justifyContent: 'space-around', alignItems: 'center', zIndex: 900, borderTop: `1px solid rgba(255,255,255,0.1)` }}>
        <button onClick={() => setActiveView('pos-catalog')} style={{ background: 'none', border: 'none', color: (activeView === 'pos-catalog' ? PINK : LIGHT), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          <ShoppingBag size={18} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Catalog</span>
        </button>
        
        <button onClick={() => setActiveView('pos-cart')} style={{ background: 'none', border: 'none', color: (activeView === 'pos-cart' ? PINK : LIGHT), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', position: 'relative' }}>
          <Plus size={18} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Cart Summary</span>
          {cart.length > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -10, background: ROSE, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifycontent: 'center' }}>
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>

        <button onClick={() => setActiveView('log')} style={{ background: 'none', border: 'none', color: (activeView === 'log' ? PINK : LIGHT), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          <RefreshCw size={18} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Audit Logs</span>
        </button>
      </div>

      {/* Scoped CSS Style Layout Injection Engine */}
      <style>{`
        .pos-grid-responsive {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .pos-grid-responsive {
            grid-template-columns: 1fr;
          }
          .desktop-view-tabs {
            display: none !important;
          }
          .mobile-action-bar {
            display: flex !important;
          }
          .mobile-hide {
            display: none !important;
          }
          .catalog-panel, .cart-panel {
            border-radius: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}