import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, Minus, ShoppingBag, Gift, Tag, RefreshCw,
  ChevronDown, ChevronUp, X, Check, Layers, MapPin, Calendar,
  Download, Edit, Save, AlertTriangle, Clock, ArrowLeftRight
} from 'lucide-react';

const API  = 'https://siraj-backend.onrender.com';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const DARK  = '#1E1023';
const ROSE  = '#BE185D';
const PINK  = '#F472B6';
const MID   = '#6B4A6E';
const LIGHT = '#D8B4D8';
const CREAM = '#FCE7F3';
const PALE  = '#FFF0F6';

const fmt = (n) => `${(+n || 0).toFixed(2)} EGP`;

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS_BADGE = {
  completed: { bg: '#d1fae5', color: '#065f46', label: '✅ Completed' },
  edited:    { bg: '#fef3c7', color: '#92400e', label: '✏️ Edited'    },
  voided:    { bg: '#fee2e2', color: '#991b1b', label: '🚫 Voided'    },
  exchanged: { bg: '#ede9fe', color: '#5b21b6', label: '🔄 Exchanged' },
};

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN HOOK — fetches server time remaining for edit window
// ─────────────────────────────────────────────────────────────────────────────
function useEditWindow(saleId, token, enabled) {
  const [secondsLeft, setSecondsLeft]   = useState(null);
  const [windowOpen,  setWindowOpen]    = useState(false);
  const [adminBypass, setAdminBypass]   = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !saleId) return;
    let mounted = true;

    const fetchWindow = async () => {
      try {
        const res  = await fetch(`${API}/api/bazaar/${saleId}/edit-window`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!mounted) return;
        if (data.adminOverride) { setAdminBypass(true); setWindowOpen(true); return; }
        setSecondsLeft(data.secondsRemaining);
        setWindowOpen(data.open);
      } catch { /* ignore */ }
    };

    fetchWindow();
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) { setWindowOpen(false); clearInterval(intervalRef.current); return 0; }
        return next;
      });
    }, 1000);

    return () => { mounted = false; clearInterval(intervalRef.current); };
  }, [saleId, token, enabled]);

  return { secondsLeft, windowOpen, adminBypass };
}

// ── Format seconds as MM:SS ───────────────────────────────────────────────────
function fmtCountdown(s) {
  if (s === null) return '';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALE ROW — rendered in sales log, manages its own countdown
// ─────────────────────────────────────────────────────────────────────────────
function SaleRow({ sale, token, isAdmin, onEdit, onVoid, onExchange, onDelete, onWhatsApp }) {
  const [expanded, setExpanded] = useState(false);
  const { secondsLeft, windowOpen, adminBypass } = useEditWindow(
    sale._id, token, expanded
  );
  const badge     = STATUS_BADGE[sale.status] || STATUS_BADGE.completed;
  const isVoided  = sale.status === 'voided';
  const canAct    = !isVoided && (adminBypass || windowOpen);

  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: `1px solid ${isVoided ? '#fecaca' : CREAM}`,
      overflow: 'hidden', boxShadow: '0 1px 6px rgba(30,16,35,0.05)',
      opacity: isVoided ? 0.7 : 1,
    }}>
      {/* Header row */}
      <div onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status badge */}
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700,
            background: badge.bg, color: badge.color }}>{badge.label}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: DARK }}>{sale.customerName}</p>
            <p style={{ fontSize: 10, color: MID, margin: 0 }}>
              {sale.customerPhone || 'No phone'} ·{' '}
              {new Date(sale.createdAt).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })}
              {sale.bazaarDay ? ` · ${sale.bazaarDay}` : ''}
              {sale.eventName  ? ` · ${sale.eventName}`  : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, fontWeight: 700,
            background: sale.paymentMethod === 'InstaPay' ? '#ede9fe' : '#d1fae5',
            color: sale.paymentMethod === 'InstaPay' ? '#7C3AED' : '#059669' }}>
            {sale.paymentMethod === 'InstaPay' ? '📱 InstaPay' : '💵 Cash'}
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: isVoided ? '#9ca3af' : ROSE,
            textDecoration: isVoided ? 'line-through' : 'none' }}>{fmt(sale.totalAmount)}</span>
          {expanded ? <ChevronUp size={15} color={MID} /> : <ChevronDown size={15} color={MID} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${CREAM}`, padding: '14px 16px', background: PALE }}>

          {/* Items */}
          {sale.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: `1px solid ${CREAM}`, color: DARK }}>
              <span>
                {item.isFreeGift && '🎁 '}
                <strong>{item.productName}</strong>
                {item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
                {item.itemNote ? <em style={{ color: MID }}> — {item.itemNote}</em> : ''}
              </span>
              <span style={{ fontWeight: 700, color: item.isFreeGift ? '#059669' : DARK }}>
                {item.isFreeGift ? 'FREE' : fmt(item.salePrice * item.quantity)}
              </span>
            </div>
          ))}

          {/* Returned items (exchange) */}
          {sale.returnedItems?.length > 0 && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: '#ede9fe', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#5b21b6', margin: '0 0 4px' }}>🔄 Returned items:</p>
              {sale.returnedItems.map((item, i) => (
                <div key={i} style={{ fontSize: 11, color: '#5b21b6' }}>
                  {item.productName}{item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: MID }}>
              <span>Subtotal</span><span>{fmt(sale.subtotal)}</span>
            </div>
            {sale.orderDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: ROSE, fontWeight: 600 }}>
                <span>Discount {sale.discountPct ? `(${sale.discountPct}%)` : ''}</span>
                <span>- {fmt(sale.orderDiscount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${LIGHT}` }}>
              <span style={{ color: DARK }}>Total</span>
              <span style={{ color: isVoided ? '#9ca3af' : ROSE, textDecoration: isVoided ? 'line-through' : 'none' }}>
                {fmt(sale.totalAmount)}
              </span>
            </div>
            {/* Additional payment (exchange) */}
            {sale.additionalPayment?.amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4, color: '#7C3AED', fontWeight: 600 }}>
                <span>+ Extra paid ({sale.additionalPayment.method})</span>
                <span>{fmt(sale.additionalPayment.amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6, color: MID }}>
              <span>Payment</span>
              <span style={{ fontWeight: 700, color: sale.paymentMethod === 'InstaPay' ? '#7C3AED' : '#059669' }}>
                {sale.paymentMethod === 'InstaPay' ? '📱 InstaPay' : '💵 Cash'}
              </span>
            </div>
            {sale.note && <p style={{ fontSize: 11, color: MID, marginTop: 8 }}>📝 {sale.note}</p>}
            {sale.voidReason && <p style={{ fontSize: 11, color: '#991b1b', marginTop: 4 }}>🚫 Void reason: {sale.voidReason}</p>}
            {sale.editedBy && <p style={{ fontSize: 10, color: MID, marginTop: 4 }}>✏️ Edited by {sale.editedBy}</p>}
            {sale.voidedBy && <p style={{ fontSize: 10, color: '#991b1b', marginTop: 2 }}>Voided by {sale.voidedBy} at {new Date(sale.voidedAt).toLocaleString()}</p>}
          </div>

          {/* Countdown timer */}
          {!isVoided && !adminBypass && secondsLeft !== null && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
              color: windowOpen ? (secondsLeft < 300 ? '#dc2626' : '#059669') : '#9ca3af', fontWeight: 700 }}>
              <Clock size={12} />
              {windowOpen
                ? `Edit window: ${fmtCountdown(secondsLeft)} remaining`
                : 'Edit window expired — admin only'}
            </div>
          )}
          {adminBypass && (
            <div style={{ marginTop: 8, fontSize: 11, color: MID, fontStyle: 'italic' }}>
              🔓 Admin override — no time limit
            </div>
          )}

          {/* Action buttons */}
          {!isVoided && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {/* WhatsApp receipt — always available */}
              {sale.customerPhone && (
                <button onClick={() => onWhatsApp(sale)}
                  style={{ padding: '6px 12px', background: '#25D366', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  📱 Send Receipt
                </button>
              )}
              {/* Edit — within window */}
              {canAct && (
                <button onClick={() => onEdit(sale)}
                  style={{ padding: '6px 12px', background: ROSE, color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  <Edit size={11} style={{ display: 'inline', marginRight: 3 }} />Edit
                </button>
              )}
              {/* Exchange — within window */}
              {canAct && (
                <button onClick={() => onExchange(sale)}
                  style={{ padding: '6px 12px', background: '#7C3AED', color: '#fff',
                    border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  <ArrowLeftRight size={11} style={{ display: 'inline', marginRight: 3 }} />Exchange
                </button>
              )}
              {/* Void — within window */}
              {canAct && (
                <button onClick={() => onVoid(sale)}
                  style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b',
                    border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  🚫 Void
                </button>
              )}
              {/* Hard delete — admin only */}
              {isAdmin && (
                <button onClick={() => onDelete(sale._id)}
                  style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b',
                    border: '1px dashed #fecaca', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                  🗑 Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BazaarPOS({ userRole = 'admin', userStore = null }) {
  const token      = localStorage.getItem('adminToken');
  const isEmployee = userRole !== 'admin';
  const storeLocation = isEmployee ? userStore : 'bazaar';

  // ── Products ──────────────────────────────────────────────────────────────
  const [products,    setProducts]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [loadingProd, setLoadingProd] = useState(true);

  // ── Event setup ───────────────────────────────────────────────────────────
  const [eventName,       setEventName]       = useState('');
  const [eventLocation,   setEventLocation]   = useState('');
  const [eventId,         setEventId]         = useState('');
  const [eventStartDate,  setEventStartDate]  = useState('');
  const [eventEndDate,    setEventEndDate]    = useState('');
  const [eventDates,      setEventDates]      = useState([]);
  const [currentDay,      setCurrentDay]      = useState('');
  const [pastEvents,      setPastEvents]      = useState([]);
  const [showEventSetup,  setShowEventSetup]  = useState(!isEmployee);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart,            setCart]            = useState([]);
  const [customer,        setCustomer]        = useState({ name: '', phone: '' });
  const [discountPct,     setDiscountPct]     = useState(0);
  const [paymentMethod,   setPaymentMethod]   = useState('Cash');
  const [orderNote,       setOrderNote]       = useState('');
  const [saving,          setSaving]          = useState(false);
  const [saveMsg,         setSaveMsg]         = useState('');
  const [lastSale,        setLastSale]        = useState(null); // for WhatsApp after complete

  // ── Bundle configurator ───────────────────────────────────────────────────
  const [configProduct,    setConfigProduct]    = useState(null);
  const [bundleSelections, setBundleSelections] = useState({});

  // ── Sales log ─────────────────────────────────────────────────────────────
  const [sales,       setSales]       = useState([]);
  const [filterDay,   setFilterDay]   = useState('All');
  const [filterEvent, setFilterEvent] = useState('All');
  const [filterStatus,setFilterStatus]= useState('All');
  const [loadingSales,setLoadingSales]= useState(true);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editingSale,       setEditingSale]       = useState(null);
  const [editCart,          setEditCart]          = useState([]);
  const [editDiscountPct,   setEditDiscountPct]   = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState('Cash');

  const [voidingSale,  setVoidingSale]  = useState(null);
  const [voidReason,   setVoidReason]   = useState('');

  const [exchangeSale,         setExchangeSale]         = useState(null);
  const [exchangeReturnItems,  setExchangeReturnItems]  = useState([]);
  const [exchangeNewItems,     setExchangeNewItems]     = useState([]);
  const [exchangeExtraAmount,  setExchangeExtraAmount]  = useState('');
  const [exchangeExtraMethod,  setExchangeExtraMethod]  = useState('Cash');

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState('pos-catalog');

  // ── Load products ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/products?limit=500&status=Active`)
      .then(r => r.json())
      .then(d => setProducts(d.results || []))
      .catch(console.error)
      .finally(() => setLoadingProd(false));
  }, []);

  // ── Load past events ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isEmployee) return;
    fetch(`${API}/api/bazaar/events`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPastEvents(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, [token, isEmployee]);

  // ── Load sales ────────────────────────────────────────────────────────────
  const fetchSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const params = [];
      if (filterDay    !== 'All') params.push(`day=${encodeURIComponent(filterDay)}`);
      if (filterEvent  !== 'All') params.push(`eventId=${encodeURIComponent(filterEvent)}`);
      if (filterStatus !== 'All') params.push(`status=${filterStatus}`);
      const url = `${API}/api/bazaar${params.length ? '?' + params.join('&') : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      setSales(Array.isArray(await r.json()) ? await r.json() : []);
    } catch (e) { console.error(e); }
    finally { setLoadingSales(false); }
  }, [filterDay, filterEvent, filterStatus, token]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  // ── Product filter ────────────────────────────────────────────────────────
  const filtered = products.filter(p =>
    (p.name_en || p.bundleName || p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Event setup ───────────────────────────────────────────────────────────
  const startEvent = () => {
    if (!eventName.trim()) return alert('Please enter an event name.');
    if (!eventStartDate || !eventEndDate) return alert('Please select start and end dates.');
    const start = new Date(eventStartDate), end = new Date(eventEndDate);
    if (start > end) return alert('End date must be after start date.');
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
      dates.push(new Date(d).toISOString().split('T')[0]);
    setEventDates(dates);
    setCurrentDay(dates[0]);
    setEventId(`${eventName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`);
    setShowEventSetup(false);
  };

  const loadExistingEvent = (ev) => {
    setEventId(ev._id);
    setEventName(ev.eventName || '');
    setEventLocation(ev.eventLocation || '');
    setShowEventSetup(false);
  };

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const handleItemAddition = (product) => {
    const isBundle = product.productType === 'Bundle' || product.bundleItems?.length > 0;
    if (isBundle) {
      const initial = {};
      (product.bundleItems || []).forEach((item, idx) => {
        const scents = Array.isArray(item.allowedScents)
          ? item.allowedScents
          : (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean);
        initial[idx] = scents[0] || 'Standard';
      });
      setBundleSelections(initial);
      setConfigProduct(product);
    } else {
      executeAddToCart(product, '');
    }
  };

  const executeAddToCart = (product, variantLabel = '', targetCart = null, setTarget = null) => {
    const price = product.price_egp || product.bundlePrice || product.price || 0;
    const key   = `${product._id}__${variantLabel}`;
    const setter = setTarget || setCart;
    setter(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        key, productId: product._id,
        productName:   product.name_en || product.bundleName || product.name,
        variantName:   variantLabel,
        originalPrice: price, salePrice: price,
        quantity: 1, isFreeGift: false, itemNote: '',
        imageUrl: product.imagePaths?.[0] || '',
      }];
    });
  };

  const finalizeBundleConfiguration = () => {
    if (!configProduct) return;
    const parts = (configProduct.bundleItems || []).map((item, idx) =>
      `${item.subProductName}: ${bundleSelections[idx] || 'Default'}`);
    executeAddToCart(configProduct, parts.join(' | '));
    setConfigProduct(null); setBundleSelections({});
  };

  const updateItem = (key, field, value) =>
    setCart(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  const removeItem = (key) => setCart(prev => prev.filter(i => i.key !== key));

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal       = cart.reduce((s, i) => s + (i.isFreeGift ? 0 : i.salePrice * i.quantity), 0);
  const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const total          = Math.max(0, subtotal - discountAmount);

  // ── Complete sale ─────────────────────────────────────────────────────────
  const completeSale = async () => {
    if (cart.length === 0) return;
    if (!isEmployee && !eventId) { alert('Please set up your event first.'); setShowEventSetup(true); return; }
    setSaving(true); setSaveMsg('');
    try {
      const res  = await fetch(`${API}/api/bazaar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId:       isEmployee ? `${storeLocation}_daily` : eventId,
          eventName:     isEmployee ? (storeLocation === 'sabeel' ? 'Sabeel Store' : 'Clouds Tex Store') : eventName,
          eventLocation: isEmployee ? '' : eventLocation,
          customerName:  customer.name  || 'Walk-in',
          customerPhone: customer.phone,
          items: cart.map(i => ({
            productId: i.productId, productName: i.productName, variantName: i.variantName,
            originalPrice: i.originalPrice, salePrice: i.salePrice,
            quantity: i.quantity, isFreeGift: i.isFreeGift, itemNote: i.itemNote,
          })),
          orderDiscount: discountAmount, discountPct, paymentMethod,
          note:      orderNote,
          bazaarDay: isEmployee ? new Date().toISOString().split('T')[0] : currentDay,
          location:  storeLocation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSaveMsg('✅ Sale saved!');
      setLastSale(data.sale);
      setCart([]); setCustomer({ name: '', phone: '' });
      setDiscountPct(0); setPaymentMethod('Cash'); setOrderNote('');
      fetchSales();
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (e) {
      setSaveMsg(`❌ ${e.message}`);
    } finally { setSaving(false); }
  };

  // ── Void sale ─────────────────────────────────────────────────────────────
  const confirmVoid = async () => {
    if (!voidingSale) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/bazaar/${voidingSale._id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: voidReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setVoidingSale(null); setVoidReason('');
      fetchSales();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  // ── Edit sale ─────────────────────────────────────────────────────────────
  const openEditSale = (sale) => {
    setEditingSale(sale);
    setEditCart(sale.items.map(item => ({
      key:           `${item.productId}__${item.variantName || ''}`,
      productId:     item.productId,
      productName:   item.productName,
      variantName:   item.variantName || '',
      originalPrice: item.originalPrice,
      salePrice:     item.salePrice,
      quantity:      item.quantity,
      isFreeGift:    item.isFreeGift,
      itemNote:      item.itemNote || '',
    })));
    setEditDiscountPct(sale.discountPct || 0);
    setEditPaymentMethod(sale.paymentMethod);
  };

  const saveEditedSale = async () => {
    if (!editingSale) return;
    setSaving(true);
    try {
      const sub  = editCart.reduce((s, i) => s + (i.isFreeGift ? 0 : i.salePrice * i.quantity), 0);
      const disc = sub * (editDiscountPct / 100);
      const res  = await fetch(`${API}/api/bazaar/${editingSale._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: editCart.map(i => ({
            productId: i.productId, productName: i.productName, variantName: i.variantName,
            originalPrice: i.originalPrice, salePrice: i.salePrice,
            quantity: i.quantity, isFreeGift: i.isFreeGift, itemNote: i.itemNote,
          })),
          paymentMethod: editPaymentMethod,
          orderDiscount: disc, discountPct: editDiscountPct,
          actualDate: editingSale.actualDate || editingSale.saleDate,
          customerName: editingSale.customerName, customerPhone: editingSale.customerPhone,
          note: editingSale.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEditingSale(null);
      fetchSales();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  // ── Exchange ──────────────────────────────────────────────────────────────
  const openExchange = (sale) => {
    setExchangeSale(sale);
    // Pre-fill return items with original sale items
    setExchangeReturnItems(sale.items.map(item => ({
      key:         `ret__${item.productId}__${item.variantName || ''}`,
      productId:   item.productId,
      productName: item.productName,
      variantName: item.variantName || '',
      salePrice:   item.salePrice,
      quantity:    item.quantity,
    })));
    setExchangeNewItems([]);
    setExchangeExtraAmount('');
    setExchangeExtraMethod('Cash');
  };

  const saveExchange = async () => {
    if (!exchangeSale) return;
    setSaving(true);
    try {
      const extraAmt = parseFloat(exchangeExtraAmount) || 0;
      const res = await fetch(`${API}/api/bazaar/${exchangeSale._id}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          returnedItems: exchangeReturnItems.map(i => ({
            productId:   i.productId,
            productName: i.productName,
            variantName: i.variantName,
            salePrice:   i.salePrice,
            quantity:    i.quantity,
          })),
          newItems: exchangeNewItems.map(i => ({
            productId:     i.productId, productName: i.productName, variantName: i.variantName,
            originalPrice: i.originalPrice, salePrice: i.salePrice,
            quantity: i.quantity, isFreeGift: i.isFreeGift, itemNote: i.itemNote,
          })),
          additionalPayment: extraAmt > 0 ? { amount: extraAmt, method: exchangeExtraMethod } : null,
          note: `Exchange on ${new Date().toLocaleDateString()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setExchangeSale(null);
      fetchSales();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  // ── Hard delete (admin only) ──────────────────────────────────────────────
  const deleteSale = async (id) => {
    if (!window.confirm('Hard delete this sale? Stock will NOT be restored. Use Void instead to restore stock.')) return;
    try {
      const res = await fetch(`${API}/api/bazaar/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchSales();
    } catch (e) { alert(e.message); }
  };

  // ── WhatsApp receipt ──────────────────────────────────────────────────────
  const sendWhatsAppReceipt = (sale) => {
    if (!sale.customerPhone) return;
    const phone   = sale.customerPhone.replace(/\D/g, '');
    const intlPhone = phone.startsWith('0') ? '2' + phone : phone.startsWith('20') ? phone : '2' + phone;
    const itemLines = sale.items.map(i =>
      `${i.isFreeGift ? '🎁 ' : ''}${i.productName}${i.variantName ? ` (${i.variantName})` : ''} × ${i.quantity} = ${i.isFreeGift ? 'FREE' : fmt(i.salePrice * i.quantity)}`
    ).join('\n');
    const body =
      `🕯️ *Siraj Candles — Sale Receipt*\n` +
      `📅 ${new Date(sale.createdAt).toLocaleDateString('en-EG')}\n\n` +
      `*Items:*\n${itemLines}\n\n` +
      `Subtotal: ${fmt(sale.subtotal)}\n` +
      (sale.orderDiscount > 0 ? `Discount: - ${fmt(sale.orderDiscount)}\n` : '') +
      `*Total: ${fmt(sale.totalAmount)}*\n` +
      `Payment: ${sale.paymentMethod}\n\n` +
      `Thank you for shopping with Siraj Candles! 🌸`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(body)}`, '_blank');
  };

  // ── Day stats ─────────────────────────────────────────────────────────────
  const activeSales = (day) => sales.filter(s =>
    s.status !== 'voided' && (day === 'All' || s.bazaarDay === day));
  const dayRevenue  = (day) => activeSales(day).reduce((s, o) => s + o.totalAmount, 0);
  const dayCash     = (day) => activeSales(day).filter(s => s.paymentMethod !== 'InstaPay').reduce((s, o) => s + o.totalAmount, 0);
  const dayInsta    = (day) => activeSales(day).filter(s => s.paymentMethod === 'InstaPay').reduce((s, o) => s + o.totalAmount, 0);
  const dayCount    = (day) => activeSales(day).length;

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCustomers = () => {
    const rows = [['Name','Phone','Event','Date','Total EGP','Payment','Status']];
    sales.forEach(s => {
      if (s.customerPhone) rows.push([
        s.customerName, s.customerPhone, s.eventName || '',
        new Date(s.createdAt).toLocaleDateString('en-EG'),
        s.totalAmount.toFixed(2), s.paymentMethod, s.status,
      ]);
    });
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `siraj-sales-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Shared input style ────────────────────────────────────────────────────
  const inp = {
    padding: '10px 12px', border: `1.5px solid ${CREAM}`, borderRadius: 8,
    fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif',
    color: DARK, background: '#fff', boxSizing: 'border-box', width: '100%',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT SETUP SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (!isEmployee && showEventSetup) {
    return (
      <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: 540, margin: '0 auto', paddingTop: 20 }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', color: DARK, marginBottom: 4 }}>
          🎪 Bazaar POS
        </h1>
        <p style={{ color: MID, fontSize: 13, marginBottom: 24 }}>Set up your event before recording sales.</p>
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, padding: 24, marginBottom: 16 }}>
          <h3 style={{ color: DARK, fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Start New Event</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={eventName} onChange={e => setEventName(e.target.value)}
              placeholder="Event name  e.g. Maadi Bazaar May 2026 *" style={inp} />
            <input value={eventLocation} onChange={e => setEventLocation(e.target.value)}
              placeholder="Location  e.g. Maadi Camp (optional)" style={inp} />
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="date" value={eventStartDate} onChange={e => setEventStartDate(e.target.value)} style={inp} />
              <input type="date" value={eventEndDate}   onChange={e => setEventEndDate(e.target.value)}   style={inp} />
            </div>
            <button onClick={startEvent} style={{
              padding: '12px', background: `linear-gradient(135deg, ${ROSE}, #9d174d)`,
              color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
              fontSize: 14, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              boxShadow: '0 4px 12px rgba(190,24,93,0.3)',
            }}>🚀 Start Recording</button>
          </div>
        </div>
        {pastEvents.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, padding: 24 }}>
            <h3 style={{ color: DARK, fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>Continue Past Event</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pastEvents.map(ev => (
                <button key={ev._id} onClick={() => loadExistingEvent(ev)} style={{
                  padding: '10px 14px', background: PALE, border: `1px solid ${CREAM}`,
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'Montserrat, sans-serif',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{ev.eventName}</div>
                  <div style={{ fontSize: 11, color: MID }}>{ev.eventLocation || 'No location'}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const displayDates = isEmployee ? [new Date().toISOString().split('T')[0]] : eventDates;

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN POS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', color: DARK, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, margin: 0, color: DARK }}>
            {isEmployee ? (storeLocation === 'sabeel' ? '🏪 Sabeel Elrashad POS' : '☁️ Clouds Tex POS') : `🎪 ${eventName}`}
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            {!isEmployee && eventLocation && (
              <span style={{ fontSize: 12, color: MID, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin style={{ width: 12 }} /> {eventLocation}
              </span>
            )}
            {!isEmployee && (
              <button onClick={() => setShowEventSetup(true)} style={{
                fontSize: 11, color: ROSE, background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Montserrat, sans-serif',
              }}>Change Event</button>
            )}
          </div>
        </div>
        <div className="desktop-tabs" style={{ display: 'flex', gap: 8 }}>
          {[['pos-catalog', '🛒 New Sale'], ['log', '📋 Sales Log']].map(([v, label]) => {
            const isActive = v === 'pos-catalog'
              ? (activeView === 'pos-catalog' || activeView === 'pos-cart')
              : activeView === v;
            return (
              <button key={v} onClick={() => setActiveView(v)} style={{
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'Montserrat, sans-serif',
                background: isActive ? `linear-gradient(135deg, ${ROSE}, #9d174d)` : CREAM,
                color: isActive ? '#fff' : MID,
                boxShadow: isActive ? '0 4px 12px rgba(190,24,93,0.2)' : 'none',
              }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          <Calendar style={{ width: 12, display: 'inline', marginRight: 4 }} />Sale Date:
        </span>
        {displayDates.map(d => (
          <button key={d} onClick={() => setCurrentDay(d)} style={{
            padding: '6px 16px', borderRadius: 20, border: '2px solid',
            borderColor: currentDay === d ? ROSE : CREAM,
            background: currentDay === d ? ROSE : '#fff',
            color: currentDay === d ? '#fff' : DARK,
            fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
          }}>{isEmployee ? d : new Date(d + 'T12:00:00').toLocaleDateString('en-EG', { day: 'numeric', month: 'short' })}</button>
        ))}
      </div>

      {/* WhatsApp receipt prompt after completing sale */}
      {lastSale && (
        <div style={{ marginBottom: 14, padding: '12px 16px', background: '#d1fae5', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>✅ Sale complete!</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {lastSale.customerPhone && (
              <button onClick={() => sendWhatsAppReceipt(lastSale)} style={{
                padding: '7px 14px', background: '#25D366', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>📱 Send WhatsApp Receipt</button>
            )}
            <button onClick={() => setLastSale(null)} style={{ padding: '7px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46' }}>✕</button>
          </div>
        </div>
      )}

      {/* ── POS CATALOG + CART ── */}
      {(activeView === 'pos-catalog' || activeView === 'pos-cart') && (
        <div className="pos-grid-responsive">
          {/* Catalog */}
          <div className={activeView === 'pos-cart' ? 'mobile-hide' : ''} style={{
            background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`,
            boxShadow: '0 2px 16px rgba(190,24,93,0.04)', overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${CREAM}`, background: '#fafafa' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, color: MID }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..." style={{ ...inp, paddingLeft: 38 }} />
              </div>
            </div>
            <div style={{ maxHeight: 580, overflowY: 'auto', padding: 14 }}>
              {loadingProd ? (
                <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>Loading catalog...</p>
              ) : filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>No products found.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))', gap: 10 }}>
                  {filtered.map(p => {
                    const isBundle  = p.productType === 'Bundle' || p.bundleItems?.length > 0;
                    const name      = p.name_en || p.bundleName || p.name;
                    const price     = p.price_egp || p.bundlePrice || p.price || 0;
                    const img       = p.imagePaths?.[0];
                    const variants  = p.variants || [];
                    const scentOpts = p.scentOptions ? p.scentOptions.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const allOpts   = variants.length > 0 ? variants : scentOpts.map(s => ({ variantName: s, price }));
                    return (
                      <div key={p._id} style={{ border: `1px solid ${CREAM}`, borderRadius: 12, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                        {img
                          ? <img src={img} alt={name} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: 90, background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag style={{ width: 24, color: LIGHT }} /></div>
                        }
                        <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, margin: '0 0 3px', lineHeight: 1.3, color: DARK,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 28 }}>{name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: ROSE, fontWeight: 700 }}>{fmt(price)}</span>
                            {isBundle && <span style={{ fontSize: 9, background: PALE, color: ROSE, padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}><Layers size={9} style={{ display: 'inline' }} /> Bundle</span>}
                          </div>
                          {isBundle ? (
                            <button onClick={() => handleItemAddition(p)} style={{ width: '100%', padding: '7px 0', background: DARK, color: '#fff', border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>⚙️ Configure</button>
                          ) : allOpts.length > 1 ? (
                            <select onChange={e => { if (e.target.value) executeAddToCart(p, e.target.value); e.target.value = ''; }}
                              style={{ width: '100%', fontSize: 10, padding: '6px 4px', border: `1px solid ${CREAM}`, borderRadius: 7, fontFamily: 'Montserrat, sans-serif', background: PALE, color: MID, fontWeight: 700, outline: 'none' }}
                              defaultValue="">
                              <option value="">Pick scent →</option>
                              {allOpts.map((v, i) => <option key={i} value={v.variantName}>{v.variantName}{v.price !== price ? ` (${fmt(v.price)})` : ''}</option>)}
                            </select>
                          ) : (
                            <button onClick={() => executeAddToCart(p, allOpts[0]?.variantName || '')}
                              style={{ width: '100%', padding: '7px 0', background: `linear-gradient(135deg, ${PINK}, ${ROSE})`, color: '#fff', border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>+ Add</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className={activeView === 'pos-catalog' ? 'mobile-hide' : ''} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}`, boxShadow: '0 2px 16px rgba(190,24,93,0.04)', padding: 20 }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: 14, color: DARK, borderBottom: `1px solid ${CREAM}`, paddingBottom: 8 }}>🛒 Current Sale</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <input value={customer.name} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Customer name" style={inp} />
              <input value={customer.phone} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" style={inp} />
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: LIGHT }}>
                <ShoppingBag style={{ width: 36, height: 36, margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: 13, color: MID, fontStyle: 'italic' }}>Add products from the catalog</p>
              </div>
            ) : (
              <div style={{ maxHeight: 270, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
                {cart.map(item => (
                  <div key={item.key} style={{ borderBottom: `1px solid ${PALE}`, paddingBottom: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: DARK }}>{item.productName}</p>
                        {item.variantName && <p style={{ fontSize: 10, color: ROSE, margin: 0, fontWeight: 600 }}>{item.variantName}</p>}
                      </div>
                      <button onClick={() => removeItem(item.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ROSE, padding: 2 }}><X style={{ width: 15 }} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${CREAM}`, borderRadius: 7, padding: '3px 7px', background: PALE }}>
                        <button onClick={() => updateItem(item.key, 'quantity', Math.max(1, item.quantity - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID, padding: 0, display: 'flex' }}><Minus style={{ width: 12 }} /></button>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center', color: DARK }}>{item.quantity}</span>
                        <button onClick={() => updateItem(item.key, 'quantity', item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID, padding: 0, display: 'flex' }}><Plus style={{ width: 12 }} /></button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag style={{ width: 11, color: MID }} />
                        <input type="number" value={item.salePrice} disabled={item.isFreeGift}
                          onChange={e => updateItem(item.key, 'salePrice', parseFloat(e.target.value) || 0)}
                          style={{ width: 64, padding: '4px 6px', border: `1px solid ${CREAM}`, borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: 'Montserrat, sans-serif', opacity: item.isFreeGift ? 0.4 : 1 }} />
                        <span style={{ fontSize: 10, color: MID }}>EGP</span>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: item.isFreeGift ? ROSE : MID }}>
                        <input type="checkbox" checked={item.isFreeGift} onChange={e => updateItem(item.key, 'isFreeGift', e.target.checked)} style={{ width: 13, height: 13, accentColor: ROSE }} />
                        <Gift style={{ width: 11 }} /> Gift
                      </label>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: MID }}>
                      <span>{item.isFreeGift ? '🎁 Free gift' : `${item.quantity} × ${fmt(item.salePrice)}`}</span>
                      <span style={{ fontWeight: 700, color: item.isFreeGift ? '#059669' : DARK }}>{item.isFreeGift ? 'FREE' : fmt(item.salePrice * item.quantity)}</span>
                    </div>
                    <input value={item.itemNote} onChange={e => updateItem(item.key, 'itemNote', e.target.value)} placeholder="Item note (optional)" style={{ ...inp, marginTop: 6, fontSize: 11, color: MID, border: `1px solid ${CREAM}` }} />
                  </div>
                ))}
              </div>
            )}
            {cart.length > 0 && (
              <>
                <div style={{ marginBottom: 12, borderTop: `1px solid ${PALE}`, paddingTop: 10 }}>
                  <label style={{ fontSize: 11, color: MID, display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Order Discount</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[0,5,10,15,20,25,30].map(pct => (
                      <button key={pct} onClick={() => setDiscountPct(pct)} style={{
                        padding: '5px 10px', borderRadius: 18, border: `1.5px solid ${discountPct === pct ? ROSE : CREAM}`,
                        background: discountPct === pct ? CREAM : '#fff', color: discountPct === pct ? ROSE : DARK,
                        fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                      }}>{pct === 0 ? 'None' : `${pct}%`}</button>
                    ))}
                  </div>
                  {discountPct > 0 && <p style={{ fontSize: 11, color: ROSE, marginTop: 5, fontWeight: 700 }}>Saving {fmt(discountAmount)} ({discountPct}% off)</p>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: MID, display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Payment Method</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['Cash','💵 Cash','#059669','#d1fae5'],['InstaPay','📱 InstaPay','#7C3AED','#ede9fe']].map(([method, label, col, bg]) => (
                      <button key={method} onClick={() => setPaymentMethod(method)} style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, border: `2px solid ${paymentMethod === method ? col : CREAM}`,
                        background: paymentMethod === method ? bg : '#fff', color: paymentMethod === method ? col : MID,
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                      }}>{label}</button>
                    ))}
                  </div>
                </div>
                <input value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="Order note (optional)" style={{ ...inp, marginBottom: 12 }} />
                <div style={{ background: PALE, borderRadius: 12, padding: '12px 14px', marginBottom: 14, border: `1px solid ${CREAM}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: MID }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                  {discountPct > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: ROSE, fontWeight: 600 }}><span>Discount ({discountPct}%)</span><span>- {fmt(discountAmount)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${LIGHT}` }}>
                    <span style={{ color: DARK }}>Total</span><span style={{ color: ROSE }}>{fmt(total)}</span>
                  </div>
                </div>
              </>
            )}
            {saveMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 12, fontWeight: 700,
                background: saveMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2',
                color: saveMsg.startsWith('✅') ? '#065f46' : '#991b1b',
                border: saveMsg.startsWith('✅') ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>{saveMsg}</div>
            )}
            <button onClick={completeSale} disabled={cart.length === 0 || saving} style={{
              width: '100%', padding: '14px 0',
              background: cart.length === 0 ? '#e5e7eb' : `linear-gradient(135deg, ${ROSE}, #9d174d)`,
              color: cart.length === 0 ? '#9ca3af' : '#fff',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800,
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif',
              boxShadow: cart.length > 0 ? '0 4px 12px rgba(190,24,93,0.3)' : 'none',
            }}>{saving ? '⏳ Saving...' : `✅ Complete Sale — ${fmt(total)}`}</button>
          </div>
        </div>
      )}

      {/* ── SALES LOG ── */}
      {activeView === 'log' && (
        <div>
          {/* Day cards — excluding voided from totals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
            {['All', ...(isEmployee ? [new Date().toISOString().split('T')[0]] : eventDates)].map(d => {
              const selected = filterDay === d;
              return (
                <div key={d} onClick={() => setFilterDay(d)} style={{
                  background: selected ? PALE : '#fff', borderRadius: 12, padding: '14px 16px',
                  boxShadow: '0 2px 8px rgba(30,16,35,0.06)',
                  border: `2px solid ${selected ? ROSE : CREAM}`, cursor: 'pointer',
                }}>
                  <p style={{ fontSize: 10, color: MID, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {d === 'All' ? 'All Days' : isEmployee ? d : new Date(d + 'T12:00:00').toLocaleDateString('en-EG', { day: 'numeric', month: 'short' })}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px', color: ROSE }}>{fmt(dayRevenue(d))}</p>
                  <p style={{ fontSize: 10, color: MID, margin: '0 0 6px' }}>{dayCount(d)} sales (excl. voided)</p>
                  <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
                    <span style={{ color: '#059669', fontWeight: 700 }}>💵 {fmt(dayCash(d))}</span>
                    <span style={{ color: '#7C3AED', fontWeight: 700 }}>📱 {fmt(dayInsta(d))}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {!isEmployee && pastEvents.length > 0 && (
              <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} style={{ ...inp, width: 'auto', padding: '7px 12px', fontSize: 12 }}>
                <option value="All">All Events</option>
                {pastEvents.map(ev => <option key={ev._id} value={ev._id}>{ev.eventName}</option>)}
              </select>
            )}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, width: 'auto', padding: '7px 12px', fontSize: 12 }}>
              <option value="All">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="edited">Edited</option>
              <option value="exchanged">Exchanged</option>
              <option value="voided">Voided</option>
            </select>
            <button onClick={fetchSales} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', border: `1px solid ${CREAM}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: MID, fontFamily: 'Montserrat, sans-serif' }}>
              <RefreshCw style={{ width: 13 }} /> Refresh
            </button>
            <button onClick={exportCustomers} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: CREAM, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: ROSE, fontFamily: 'Montserrat, sans-serif' }}>
              <Download style={{ width: 13 }} /> Export CSV
            </button>
          </div>

          {loadingSales ? (
            <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>Loading sales...</p>
          ) : sales.filter(s => filterDay === 'All' || s.bazaarDay === filterDay).length === 0 ? (
            <p style={{ textAlign: 'center', color: MID, padding: 40, fontStyle: 'italic' }}>No sales recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sales.filter(s => filterDay === 'All' || s.bazaarDay === filterDay).map(sale => (
                <SaleRow
                  key={sale._id}
                  sale={sale}
                  token={token}
                  isAdmin={!isEmployee}
                  onEdit={openEditSale}
                  onVoid={s => { setVoidingSale(s); setVoidReason(''); }}
                  onExchange={openExchange}
                  onDelete={deleteSale}
                  onWhatsApp={sendWhatsAppReceipt}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BUNDLE MODAL ── */}
      {configProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${CREAM}`, paddingBottom: 10 }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: DARK, margin: 0 }}>Configure Bundle</h3>
              <button onClick={() => setConfigProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {(configProduct.bundleItems || []).map((item, idx) => {
                const scents = Array.isArray(item.allowedScents) ? item.allowedScents : (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean);
                return (
                  <div key={idx} style={{ background: PALE, padding: 12, borderRadius: 10, border: `1px solid ${CREAM}` }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: DARK, display: 'block', marginBottom: 8 }}>{item.subProductName} {item.size ? `(${item.size})` : ''}</label>
                    {scents.length <= 5 ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {scents.map(scent => {
                          const selected = bundleSelections[idx] === scent;
                          return <button key={scent} onClick={() => setBundleSelections(p => ({ ...p, [idx]: scent }))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid', borderColor: selected ? ROSE : LIGHT, background: selected ? ROSE : '#fff', color: selected ? '#fff' : DARK, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>{scent}</button>;
                        })}
                      </div>
                    ) : (
                      <select value={bundleSelections[idx] || ''} onChange={e => setBundleSelections(p => ({ ...p, [idx]: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1.5px solid ${CREAM}`, fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}>
                        {scents.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={finalizeBundleConfiguration} style={{ width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${PINK}, ${ROSE})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={16} /> Confirm Bundle
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT SALE MODAL ── */}
      {editingSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: DARK, margin: 0 }}>✏️ Edit Sale</h3>
              <button onClick={() => setEditingSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              {editCart.map((item, idx) => (
                <div key={idx} style={{ border: `1px solid ${CREAM}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: DARK, margin: 0 }}>{item.productName}</p>
                      {item.variantName && <p style={{ fontSize: 10, color: ROSE, margin: 0 }}>{item.variantName}</p>}
                    </div>
                    <button onClick={() => setEditCart(prev => prev.filter((_, i) => i !== idx))} style={{ color: ROSE, background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: MID }}>Qty:</span>
                      <input type="number" min="1" value={item.quantity}
                        onChange={e => setEditCart(prev => prev.map((i, j) => j === idx ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))}
                        style={{ width: 54, padding: '4px 6px', border: `1px solid ${CREAM}`, borderRadius: 6, fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: MID }}>Price:</span>
                      <input type="number" value={item.salePrice}
                        onChange={e => setEditCart(prev => prev.map((i, j) => j === idx ? { ...i, salePrice: parseFloat(e.target.value) || 0 } : i))}
                        style={{ width: 72, padding: '4px 6px', border: `1px solid ${CREAM}`, borderRadius: 6, fontSize: 12 }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <input type="checkbox" checked={item.isFreeGift}
                        onChange={e => setEditCart(prev => prev.map((i, j) => j === idx ? { ...i, isFreeGift: e.target.checked } : i))} />
                      Gift
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: MID, display: 'block', marginBottom: 6 }}>Payment Method</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Cash','#059669'],['InstaPay','#7C3AED']].map(([method, col]) => (
                  <button key={method} onClick={() => setEditPaymentMethod(method)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `2px solid ${editPaymentMethod === method ? col : CREAM}`, background: editPaymentMethod === method ? col + '20' : '#fff', color: editPaymentMethod === method ? col : MID, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{method}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: MID, display: 'block', marginBottom: 6 }}>Discount %</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[0,5,10,15,20,25,30].map(pct => (
                  <button key={pct} onClick={() => setEditDiscountPct(pct)} style={{ padding: '5px 10px', borderRadius: 18, border: `1.5px solid ${editDiscountPct === pct ? ROSE : CREAM}`, background: editDiscountPct === pct ? CREAM : '#fff', color: editDiscountPct === pct ? ROSE : DARK, fontSize: 11, cursor: 'pointer' }}>{pct === 0 ? 'None' : `${pct}%`}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${CREAM}`, marginBottom: 14, fontWeight: 800 }}>
              <span style={{ color: DARK }}>New Total:</span>
              <span style={{ color: ROSE }}>{fmt(editCart.reduce((s, i) => s + (i.isFreeGift ? 0 : i.salePrice * i.quantity), 0) * (1 - editDiscountPct / 100))}</span>
            </div>
            <button onClick={saveEditedSale} disabled={saving} style={{ width: '100%', padding: '12px 0', background: `linear-gradient(135deg, ${ROSE}, #9d174d)`, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── VOID MODAL ── */}
      {voidingSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: '#991b1b', margin: '0 0 8px' }}>🚫 Void Sale</h3>
            <p style={{ fontSize: 13, color: MID, marginBottom: 16 }}>
              This will cancel the sale and restore all stock.<br />
              <strong>Total: {fmt(voidingSale.totalAmount)}</strong> — {voidingSale.customerName}
            </p>
            <label style={{ fontSize: 11, fontWeight: 700, color: MID, display: 'block', marginBottom: 6 }}>Reason (optional)</label>
            <input value={voidReason} onChange={e => setVoidReason(e.target.value)}
              placeholder="e.g. Customer changed mind, wrong item..."
              style={{ ...inp, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmVoid} disabled={saving} style={{ flex: 1, padding: '11px 0', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {saving ? 'Voiding...' : '🚫 Confirm Void'}
              </button>
              <button onClick={() => setVoidingSale(null)} style={{ flex: 1, padding: '11px 0', background: CREAM, color: ROSE, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXCHANGE MODAL ── */}
      {exchangeSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 22, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 700, color: '#5b21b6', margin: 0 }}>🔄 Exchange</h3>
              <button onClick={() => setExchangeSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', display: 'block', marginBottom: 8 }}>↩️ Customer Returns:</label>
              {exchangeReturnItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '8px 10px', background: '#fee2e2', borderRadius: 8 }}>
                  <div style={{ flex: 1, fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                    {item.productName}{item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
                  </div>
                  <button onClick={() => setExchangeReturnItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}><X size={12} /></button>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#059669', display: 'block', marginBottom: 8 }}>✅ Customer Gets (search catalog):</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, color: MID }} />
                <input placeholder="Search product to add..." style={{ ...inp, paddingLeft: 32, fontSize: 12 }}
                  onChange={e => setSearch(e.target.value)} />
              </div>
              {search && (
                <div style={{ maxHeight: 140, overflowY: 'auto', border: `1px solid ${CREAM}`, borderRadius: 8, marginBottom: 8 }}>
                  {filtered.slice(0, 8).map(p => (
                    <button key={p._id} onClick={() => {
                      const price = p.price_egp || p.price || 0;
                      setExchangeNewItems(prev => [...prev, {
                        key: `new__${p._id}__${Date.now()}`,
                        productId: p._id, productName: p.name_en || p.bundleName || p.name,
                        variantName: '', originalPrice: price, salePrice: price,
                        quantity: 1, isFreeGift: false, itemNote: '',
                      }]);
                      setSearch('');
                    }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `1px solid ${CREAM}`, cursor: 'pointer', fontSize: 12 }}>
                      {p.name_en || p.bundleName || p.name} — {fmt(p.price_egp || p.price || 0)}
                    </button>
                  ))}
                </div>
              )}
              {exchangeNewItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '8px 10px', background: '#d1fae5', borderRadius: 8 }}>
                  <div style={{ flex: 1, fontSize: 12, color: '#065f46', fontWeight: 600 }}>{item.productName}</div>
                  <input type="number" min="1" value={item.quantity}
                    onChange={e => setExchangeNewItems(prev => prev.map((i, j) => j === idx ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))}
                    style={{ width: 48, padding: '3px 5px', border: '1px solid #bbf7d0', borderRadius: 5, fontSize: 12 }} />
                  <span style={{ fontSize: 11, color: '#065f46' }}>{fmt(item.salePrice)}</span>
                  <button onClick={() => setExchangeNewItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}><X size={12} /></button>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16, padding: 12, background: '#ede9fe', borderRadius: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#5b21b6', display: 'block', marginBottom: 8 }}>💜 Price Difference (if new items cost more):</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min="0" value={exchangeExtraAmount} onChange={e => setExchangeExtraAmount(e.target.value)}
                  placeholder="Extra amount EGP" style={{ ...inp, flex: 1 }} />
                {[['Cash','💵'],['InstaPay','📱']].map(([m, icon]) => (
                  <button key={m} onClick={() => setExchangeExtraMethod(m)} style={{
                    padding: '8px 12px', borderRadius: 8, border: `2px solid ${exchangeExtraMethod === m ? '#7C3AED' : '#c4b5fd'}`,
                    background: exchangeExtraMethod === m ? '#ede9fe' : '#fff', color: '#5b21b6',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}>{icon} {m}</button>
                ))}
              </div>
              {parseFloat(exchangeExtraAmount) > 0 && <p style={{ fontSize: 11, color: '#5b21b6', marginTop: 6, fontWeight: 700 }}>Customer pays extra: {fmt(parseFloat(exchangeExtraAmount))} via {exchangeExtraMethod}</p>}
            </div>
            <button onClick={saveExchange} disabled={saving} style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #7C3AED, #5b21b6)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              {saving ? 'Processing...' : '🔄 Confirm Exchange'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile sticky nav */}
      <div className="mobile-nav-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, background: DARK, display: 'none', justifyContent: 'space-around', alignItems: 'center', zIndex: 900, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {[['pos-catalog', ShoppingBag, 'Catalog'], ['pos-cart', Plus, 'Cart'], ['log', RefreshCw, 'Log']].map(([v, Icon, label]) => {
          const isActive = activeView === v || (v === 'pos-catalog' && activeView === 'pos-cart');
          return (
            <button key={v} onClick={() => setActiveView(v)} style={{ background: 'none', border: 'none', color: isActive ? PINK : LIGHT, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', position: 'relative' }}>
              <Icon size={18} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
              {v === 'pos-cart' && cart.length > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -8, background: ROSE, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        .pos-grid-responsive { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }
        @media (max-width: 1024px) { .pos-grid-responsive { grid-template-columns: 1fr; } .desktop-tabs { display: none !important; } .mobile-nav-bar { display: flex !important; } .mobile-hide { display: none !important; } }
      `}</style>
    </div>
  );
}