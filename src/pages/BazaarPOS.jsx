import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, Gift, Tag, RefreshCw, ChevronDown, ChevronUp, X, Check, Layers, MapPin, Calendar, QrCode, TrendingUp, Wallet } from 'lucide-react';

const API = 'https://siraj-backend.onrender.com';
const DAYS = ['Day 1', 'Day 2', 'Day 3'];

const DARK    = '#1E1023';
const PINK    = '#F472B6';
const ROSE    = '#BE185D';
const PALE    = '#FFF0F6';
const MID     = '#6B4A6E';
const LIGHT   = '#D8B4D8';
const CREAM   = '#FCE7F3';

const fmt = (n) => `${(+n || 0).toFixed(2)} EGP`;

export default function BazaarPOS() {
  const token = localStorage.getItem('adminToken');

  // ── State Matrices ──────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingProd, setLoadingProd] = useState(true);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [discountPct, setDiscountPct] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderNote, setOrderNote] = useState('');
  const [currentDay, setCurrentDay] = useState('Day 1');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── Custom Event Creator Engine States ──────────────────────────────────────
  const [eventsList, setEventsList] = useState([]);
  const [activeEvent, setActiveEvent] = useState({ id: 'ev_default', name: 'Weekly General Bazaar', location: ' Cairo Headquarters' });
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState({ name: '', location: '' });

  // ── Analytics & Structural View Logs States ────────────────────────────────
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [expandedSale, setExpandedSale] = useState(null);
  const [activeView, setActiveView] = useState('pos-catalog'); 
  const [showQrModal, setShowQrModal] = useState(false);

  // ── Component Bundle Customization States ──────────────────────────────────
  const [configProduct, setConfigProduct] = useState(null);
  const [bundleSelections, setBundleSelections] = useState({});

  // ── Data Ingestion ──────────────────────────────────────────────────────────
  const fetchActiveEvents = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/bazaar/events`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (data.length > 0) setEventsList(data);
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchSalesLogs = useCallback(async () => {
    setLoadingSales(true);
    try {
      const r = await fetch(`${API}/api/bazaar?eventId=${activeEvent.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSales(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoadingSales(false); }
  }, [activeEvent.id, token]);

  useEffect(() => {
    fetch(`${API}/api/products?limit=500&status=Active`)
      .then(r => r.json())
      .then(d => setProducts(d.results || []))
      .catch(console.error)
      .finally(() => setLoadingProd(false));
    fetchActiveEvents();
  }, [fetchActiveEvents]);

  useEffect(() => { fetchSalesLogs(); }, [fetchSalesLogs]);

  const filtered = products.filter(p => {
    const name = (p.name_en || p.bundleName || p.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const createNewEventObject = (e) => {
    e.preventDefault();
    if (!newEventForm.name || !newEventForm.location) return;
    const generatedId = 'ev_' + Date.now();
    const createdObj = { id: generatedId, name: newEventForm.name, location: newEventForm.location };
    setActiveEvent(createdObj);
    setEventsList(prev => [createdObj, ...prev]);
    setNewEventForm({ name: '', location: '' });
    setShowEventModal(false);
  };

  const handleItemAddition = (product) => {
    const isBundle = product.productType === 'Bundle' || (product.bundleItems && product.bundleItems.length > 0);
    if (isBundle) {
      const initialSelections = {};
      (product.bundleItems || []).forEach((item, idx) => {
        const scents = Array.isArray(item.allowedScents) ? item.allowedScents : (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean);
        initialSelections[idx] = scents[0] || 'Standard';
      });
      setBundleSelections(initialSelections);
      setConfigProduct(product);
    } else {
      executeAddToCart(product, '');
    }
  };

  const executeAddToCart = (product, variantLabel = '') => {
    const price = product.price_egp || product.bundlePrice || product.price || 0;
    const key = `${product._id}__${variantLabel}`;
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        key, productId: product._id,
        productName: product.name_en || product.bundleName || product.name,
        variantName: variantLabel, category: product.category || 'General',
        originalPrice: price, salePrice: price, quantity: 1, isFreeGift: false, itemNote: ''
      }];
    });
  };

  const finalizeBundleConfiguration = () => {
    const summaryParts = (configProduct.bundleItems || []).map((item, idx) => `${item.subProductName}: ${bundleSelections[idx] || 'Default'}`);
    executeAddToCart(configProduct, summaryParts.join(' | '));
    setConfigProduct(null);
  };

  const updateItem = (key, field, value) => {
    setCart(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const removeItem = (key) => setCart(prev => prev.filter(i => i.key !== key));

  const subtotal = cart.reduce((s, i) => s + (i.isFreeGift ? 0 : i.salePrice * i.quantity), 0);
  const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const total          = Math.max(0, subtotal - discountAmount);

  const completeSale = async () => {
    if (cart.length === 0) return;
    setSaving(true); setSaveMsg('');
    try {
      const res = await fetch(`${API}/api/bazaar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: activeEvent.id, eventName: activeEvent.name, eventLocation: activeEvent.location,
          customerName: customer.name || 'Walk-in', customerPhone: customer.phone,
          items: cart.map(i => ({
            productId: i.productId, productName: i.productName, variantName: i.variantName,
            originalPrice: i.originalPrice, salePrice: i.salePrice, quantity: i.quantity,
            isFreeGift: i.isFreeGift, itemNote: i.itemNote
          })),
          orderDiscount: discountAmount, discountPct: discountPct, paymentMethod, note: orderNote, bazaarDay: currentDay
        })
      });
      if (!res.ok) throw new Error('Failed to register invoice processing.');
      setSaveMsg('✅ Sale processed into global ledger!');
      setCart([]); setCustomer({ name: '', phone: '' }); setDiscountPct(0); setPaymentMethod('Cash'); setOrderNote('');
      fetchSalesLogs();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) { setSaveMsg(`❌ ${e.message}`); }
    finally { setSaving(false); }
  };

  const deleteSale = async (id) => {
    if (!window.confirm('Delete this record permanently?')) return;
    await fetch(`${API}/api/bazaar/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchSalesLogs();
  };

  // ── STRATEGIC ANALYTICS CALCULATION PARSERS ────────────────────────────────
  const totalRevenue = sales.reduce((s, o) => s + o.totalAmount, 0);
  const cashVaultTotal = sales.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + o.totalAmount, 0);
  const instapayVaultTotal = sales.filter(o => o.paymentMethod === 'InstaPay').reduce((s, o) => s + o.totalAmount, 0);
  
  // Parse Best Performing Metrics Maps
  const getMetricsSummary = () => {
    const itemCounts = {};
    const weekdayRevenue = {};
    const monthdayRevenue = {};

    sales.forEach(s => {
      // Weekday Tracking
      weekdayRevenue[s.dayOfWeek] = (weekdayRevenue[s.dayOfWeek] || 0) + s.totalAmount;
      // Month Day Tracking
      monthdayRevenue[s.dayOfMonth] = (monthdayRevenue[s.dayOfMonth] || 0) + s.totalAmount;
      // Product quantities
      s.items.forEach(i => {
        itemCounts[i.productName] = (itemCounts[i.productName] || 0) + i.quantity;
      });
    });

    const bestProduct = Object.keys(itemCounts).reduce((a, b) => itemCounts[a] > itemCounts[b] ? a : b, 'None');
    const bestDayOfWeek = Object.keys(weekdayRevenue).reduce((a, b) => weekdayRevenue[a] > weekdayRevenue[b] ? a : b, 'None');
    const bestDayOfMonth = Object.keys(monthdayRevenue).reduce((a, b) => monthdayRevenue[a] > monthdayRevenue[b] ? a : b, 'None');

    return { bestProduct, bestDayOfWeek, bestDayOfMonth };
  };

  const metrics = getMetricsSummary();

  return (
    <div className="bazaar-container" style={{ fontFamily: 'Montserrat, sans-serif', color: DARK, paddingBottom: 80 }}>
      
      {/* ── Active Event Selection Module Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12, background: '#fff', padding: 16, borderRadius: 12, border: `1px solid ${CREAM}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin color={ROSE} size={20} />
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: MID, textTransform: 'uppercase' }}>Active Gateway Event</label>
            <select value={activeEvent.id} onChange={(e) => {
              const selected = eventsList.find(ev => ev.id === e.target.value);
              if (selected) setActiveEvent(selected);
            }} style={{ display: 'block', border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 700, color: DARK, outline: 'none', cursor: 'pointer', fontFamily: 'Montserrat' }}>
              {eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.location})</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setShowEventModal(true)} style={{ padding: '8px 16px', background: DARK, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14}/> Create New Event
        </button>
      </div>

      {/* ── Core Navigation Tabs ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div className="desktop-view-tabs" style={{ display: 'flex', gap: 10 }}>
          {[{ id: 'pos-catalog', label: '🛒 POS Matrix Catalog' }, { id: 'log', label: '📋 Strategic Summary Logs' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id)} style={{
              padding: '12px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: (activeView === tab.id || (tab.id === 'pos-catalog' && activeView === 'pos-cart')) ? `linear-gradient(135deg, ${ROSE}, #9d174d)` : CREAM, 
              color: (activeView === tab.id || (tab.id === 'pos-catalog' && activeView === 'pos-cart')) ? '#fff' : MID
            }}>{tab.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAYS.map(d => <button key={d} onClick={() => setCurrentDay(d)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: currentDay === d ? ROSE : CREAM, background: currentDay === d ? ROSE : '#fff', color: currentDay === d ? '#fff' : DARK, fontSize: 11, fontWeight: 700 }}>{d}</button>)}
        </div>
      </div>

      {/* ── VIEW ROUTER ── */}
      {(activeView === 'pos-catalog' || activeView === 'pos-cart') && (
        <div className="pos-grid-responsive">
          {/* CATALOG SELECTION MATRIX */}
          <div className={`${activeView === 'pos-cart' ? 'mobile-hide' : ''}`} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${CREAM}` }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type product name to filter matrix grid..." style={{ width: '100%', padding: 12, border: `1.5px solid ${CREAM}`, borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto', padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                {filtered.map(p => (
                  <div key={p._id} style={{ border: `1px solid ${CREAM}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifycontent: 'space-between', paddingBottom: 10 }}>
                    <img src={p.imagePaths?.[0] || ''} alt="" style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                    <div style={{ padding: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, margin: '0 0 4px', minHeight: 28, overflow: 'hidden' }}>{p.name_en || p.bundleName || p.name}</p>
                      <p style={{ fontSize: 12, color: ROSE, fontWeight: 800, margin: 0 }}>{fmt(p.price_egp || p.bundlePrice || 0)}</p>
                    </div>
                    <button onClick={() => handleItemAddition(p)} style={{ margin: '0 8px', padding: '6px 0', background: DARK, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Add Item</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHECKOUT CART CONTROLLER */}
          <div className={`${activeView === 'pos-catalog' ? 'mobile-hide' : ''}`} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px 0', fontFamily: 'Cormorant Garamond', fontSize: '1.4rem', fontWeight: 700 }}>🛒 Checkout Terminal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Client Name" style={{ padding: 10, border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12 }} />
              <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Client Phone" style={{ padding: 10, border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12 }} />
            </div>

            {/* Cart Loop */}
            {cart.map(item => (
              <div key={item.key} style={{ borderBottom: `1px solid ${PALE}`, paddingBottom: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{item.productName}</p>
                  <span style={{ fontSize: 11, color: MID }}>{item.quantity} × {fmt(item.salePrice)}</span>
                </div>
                <button onClick={() => removeItem(item.key)} style={{ background: 'none', border: 'none', color: ROSE, cursor: 'pointer' }}><Trash2 size={14}/></button>
              </div>
            ))}

            {/* Instant Scan Toggle & Configurator */}
            {cart.length > 0 && (
              <div style={{ margin: '14px 0', borderTop: `1px solid ${PALE}`, paddingTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: MID, display: 'block', marginBottom: 6 }}>Accounting Target</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {['Cash', 'InstaPay'].map(method => (
                    <button key={method} type="button" onClick={() => {
                      setPaymentMethod(method);
                      if (method === 'InstaPay') setShowQrModal(true);
                    }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '2px solid', borderColor: paymentMethod === method ? ROSE : CREAM, background: paymentMethod === method ? CREAM : '#fff', color: paymentMethod === method ? ROSE : DARK, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      {method === 'Cash' ? '💵 Cash Vault' : '📱 Scan InstaPay'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div style={{ background: PALE, padding: 12, borderRadius: 10, border: `1px solid ${CREAM}`, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
                  <span>Net Floor Due</span><span style={{ color: ROSE }}>{fmt(total)}</span>
                </div>
              </div>
            )}

            <button onClick={completeSale} disabled={cart.length === 0 || saving} style={{ width: '100%', padding: '12px 0', background: cart.length === 0 ? '#e5e7eb' : ROSE, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Processing...' : 'Complete Invoice Settlement'}
            </button>
          </div>
        </div>
      )}

      {/* ── STRATEGIC SUMMARY LOG VIEW PANEL ── */}
      {activeView === 'log' && (
        <div>
          {/* Audit Vault Aggregation Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}><Wallet size={16}/> Cash Box Verification</div>
              <p style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 0', color: DARK }}>{fmt(cashVaultTotal)}</p>
            </div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #c7d2fe', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}><QrCode size={16}/> InstaPay Wallet Audit</div>
              <p style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 0', color: DARK }}>{fmt(instapayVaultTotal)}</p>
            </div>
          </div>

          {/* Core Weekday / Date Strategy Box */}
          <div style={{ background: DARK, color: '#fff', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}><TrendingUp size={18} color={PINK}/> Historical Performance Analysis Matrix</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, color: LIGHT, textTransform: 'uppercase' }}>Top Selling Product</span>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 0' }}>{metrics.bestProduct}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: LIGHT, textTransform: 'uppercase' }}>Optimal Weekday Conversion</span>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 0' }}>{metrics.bestDayOfWeek}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: LIGHT, textTransform: 'uppercase' }}>Optimal Date Target</span>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 0' }}>Day {metrics.bestDayOfMonth} of the Month</p>
              </div>
            </div>
          </div>

          {/* Simple Invoices List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sales.map(sale => (
              <div key={sale._id} style={{ background: '#fff', padding: 14, borderRadius: 12, border: `1px solid ${CREAM}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{sale.customerName} ({sale.paymentMethod})</p>
                  <span style={{ fontSize: 11, color: MID }}>{sale.dayOfWeek}, Day {sale.dayOfMonth} · {sale.items.length} items</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 800, color: ROSE }}>{fmt(sale.totalAmount)}</span>
                  <button onClick={() => deleteSale(sale._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EVENT CREATOR MODAL OVERLAY ── */}
      {showEventModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={createNewEventObject} style={{ background: '#fff', padding: 24, borderRadius: 16, width: '100%', maxWidth: 360, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700 }}>📋 Initialize New Weekly Event</h4>
            <input required value={newEventForm.name} onChange={e => setNewEventForm(p => ({ ...p, name: e.target.value }))} placeholder="Event Name (e.g. Autumn Bazaar)" style={{ width: '100%', padding: 10, border: `1px solid ${CREAM}`, borderRadius: 8, marginBottom: 12, outline: 'none' }} />
            <input required value={newEventForm.location} onChange={e => setNewEventForm(p => ({ ...p, location: e.target.value }))} placeholder="Location (e.g. Zamalek Club)" style={{ width: '100%', padding: 10, border: `1px solid ${CREAM}`, borderRadius: 8, marginBottom: 16, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setShowEventModal(false)} style={{ flex: 1, padding: 10, background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ flex: 1, padding: 10, background: ROSE, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Launch Event</button>
            </div>
          </form>
        </div>
      )}

      {/* ── INSTAPAY DIGITAL QR SCANNABLE OVERLAY MODAL ── */}
      {showQrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: '100%', maxWidth: 320, textAlignment: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700 }}>📱 InstaPay Instant Scan</h4>
            <p style={{ fontSize: 11, color: MID, margin: '0 0 16px' }}>Let the customer scan to forward checkout verification payment</p>
            
            {/* Scannable Dynamic Box Frame Container */}
            <div style={{ width: 180, height: 180, margin: '0 auto 16px', background: DARK, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 10 }}>
              <QrCode size={100} color={PINK} />
              <span style={{ fontSize: 10, fontWeight: 700, marginTop: 8, letterSpacing: '0.05em', color: LIGHT }}>SIRAJ PAY GATEWAY</span>
            </div>

            <p style={{ fontSize: 13, fontWeight: 700, color: ROSE, margin: '0 0 20px' }}>Total Collection: {fmt(total)}</p>
            <button type="button" onClick={() => setShowQrModal(false)} style={{ width: '100%', padding: '10px 0', background: DARK, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Verified & Received</button>
          </div>
        </div>
      )}

      {/* Persistent Sticky Mobile Action Navigation Frame */}
      <div className="mobile-action-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: DARK, display: 'none', justifyContent: 'space-around', alignItems: 'center', zIndex: 900 }}>
        <button onClick={() => setActiveView('pos-catalog')} style={{ background: 'none', border: 'none', color: (activeView === 'pos-catalog' ? PINK : LIGHT), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><ShoppingBag size={18} /><span style={{ fontSize: 10 }}>Catalog</span></button>
        <button onClick={() => setActiveView('pos-cart')} style={{ background: 'none', border: 'none', color: (activeView === 'pos-cart' ? PINK : LIGHT), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}><Plus size={18} /><span style={{ fontSize: 10 }}>Cart</span></button>
        <button onClick={() => setActiveView('log')} style={{ background: 'none', border: 'none', color: (activeView === 'log' ? PINK : LIGHT), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><RefreshCw size={18} /><span style={{ fontSize: 10 }}>Analysis</span></button>
      </div>

      <style>{`
        .pos-grid-responsive { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
        @media (max-width: 1024px) {
          .pos-grid-responsive { grid-template-columns: 1fr; }
          .desktop-view-tabs { display: none !important; }
          .mobile-action-bar { display: flex !important; }
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </div>
  );
}