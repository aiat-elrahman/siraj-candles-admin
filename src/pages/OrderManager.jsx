import React, { useState, useCallback, useEffect } from 'react';
import { Eye, X, RefreshCw, Phone, Printer, Download } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const STATUS_STYLES = {
  Pending:    { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  Processing: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  Shipped:    { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  Delivered:  { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  Cancelled:  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const DARK  = '#1E1023';
const PINK  = '#F472B6';
const ROSE  = '#BE185D';
const MID   = '#6B4A6E';
const PALE  = '#FFF0F6';
const CREAM = '#FCE7F3';

const OrderManager = () => {
  const [orders, setOrders]           = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage]         = useState('');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchOrders = useCallback(async () => {
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchOrders().finally(() => setIsLoading(false));
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!window.confirm(`Mark order as "${newStatus}"?`)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await res.json();
      if (res.ok) {
        await fetchOrders();
        if (viewingOrder?._id === orderId) {
          setViewingOrder(prev => ({ ...prev, status: newStatus }));
        }
      } else {
        setMessage(`Error: ${result.message || 'Update failed'}`);
      }
    } catch (err) {
      setMessage(`Network Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsApp = (order) => {
    const phone = order.customerInfo?.phone?.replace(/\D/g, '');
    if (!phone) { alert('No phone number on this order.'); return; }
    const itemsList = order.items?.map(i => `• ${i.name} x${i.quantity}`).join('\n') || '';
    const msg = encodeURIComponent(
      `Hello ${order.customerInfo?.name}! 👋\n\nThank you for your order from Siraj Candles 🕯️\n\nOrder: #${order._id.slice(-8)}\n\nItems:\n${itemsList}\n\nTotal: ${order.totalAmount?.toFixed(2)} EGP\n\nStatus: ${order.status}\n\nPlease let us know if you have any questions! ❤️`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const printInvoice = (order) => {
    const win = window.open('', '_blank');
    const itemsHtml = order.items?.map(item => `
      <tr>
        <td style="padding:8px 12px; border-bottom:1px solid #fce7f3;">${item.name}${item.variantName ? ` (${item.variantName})` : ''}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #fce7f3; text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #fce7f3; text-align:right;">${item.price?.toFixed(2)} EGP</td>
        <td style="padding:8px 12px; border-bottom:1px solid #fce7f3; text-align:right;">${(item.price * item.quantity).toFixed(2)} EGP</td>
      </tr>
    `).join('') || '';

    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Invoice #${order._id.slice(-8)}</title>
      <style>
        body { font-family: 'Georgia', serif; color: #2c2420; margin: 0; padding: 40px; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #a98e82; padding-bottom: 20px; margin-bottom: 28px; }
        .brand { font-size: 2rem; font-weight: 700; letter-spacing: 0.04em; color: #2c2420; }
        .brand-sub { font-size: 0.8rem; color: #8c7268; text-transform: uppercase; letter-spacing: 0.15em; }
        .invoice-meta { text-align: right; font-size: 0.88rem; color: #5a4f4a; }
        .invoice-meta .inv-num { font-size: 1.1rem; font-weight: 700; color: #2c2420; margin-bottom: 4px; }
        .section-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8c7268; margin-bottom: 8px; }
        .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
        .info-box { background: #fdf8f5; border-radius: 8px; padding: 14px 16px; }
        .info-box p { margin: 3px 0; font-size: 0.88rem; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead th { background: #1e1023; color: #fff; padding: 10px 12px; text-align: left; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
        thead th:not(:first-child) { text-align: center; }
        thead th:last-child { text-align: right; }
        .totals { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-top: 8px; }
        .totals p { margin: 0; font-size: 0.9rem; color: #5a4f4a; display: flex; gap: 40px; }
        .totals .grand { font-weight: 700; font-size: 1.1rem; color: #2c2420; border-top: 1px solid #a98e82; padding-top: 8px; margin-top: 4px; }
        .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #8c7268; border-top: 1px solid #e0d5ca; padding-top: 16px; }
        @media print { body { padding: 20px; } }
      </style>
      </head><body>
      <div class="header">
        <div>
          <div class="brand">Siraj</div>
          <div class="brand-sub">Candles & Care</div>
        </div>
        <div class="invoice-meta">
          <div class="inv-num">Invoice #${order._id.slice(-8)}</div>
          <div>Date: ${new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div>Status: <strong>${order.status}</strong></div>
        </div>
      </div>

      <div class="customer-grid">
        <div class="info-box">
          <div class="section-title">Customer</div>
          <p><strong>${order.customerInfo?.name || 'N/A'}</strong></p>
          <p>${order.customerInfo?.phone || ''}</p>
          <p>${order.customerInfo?.email || ''}</p>
        </div>
        <div class="info-box">
          <div class="section-title">Shipping Address</div>
          <p>${order.customerInfo?.address || ''}</p>
          <p>${order.customerInfo?.city || ''}</p>
          <p>Payment: ${order.paymentMethod || 'COD'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="totals">
        <p><span>Subtotal:</span><span>${order.subtotal?.toFixed(2) || order.totalAmount?.toFixed(2)} EGP</span></p>
        <p><span>Shipping:</span><span>${order.shippingFee?.toFixed(2) || '0.00'} EGP</span></p>
        <p class="grand"><span>Total:</span><span>${order.totalAmount?.toFixed(2)} EGP</span></p>
      </div>

      ${order.customerInfo?.notes ? `<div class="info-box" style="margin-top:20px;"><div class="section-title">Notes</div><p>${order.customerInfo.notes}</p></div>` : ''}

      <div class="footer">
        Thank you for shopping with Siraj Candles 🕯️ · sirajcare.com · orders@sirajcandles.com
      </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const exportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Email', 'City', 'Items', 'Subtotal', 'Shipping', 'Total', 'Status', 'Payment', 'Notes'];
    const rows = orders.map(o => [
      o._id.slice(-8),
      new Date(o.createdAt).toLocaleDateString('en-GB'),
      o.customerInfo?.name || '',
      o.customerInfo?.phone || '',
      o.customerInfo?.email || '',
      o.customerInfo?.city || '',
      o.items?.map(i => `${i.name} x${i.quantity}`).join(' | ') || '',
      o.subtotal?.toFixed(2) || '',
      o.shippingFee?.toFixed(2) || '0.00',
      o.totalAmount?.toFixed(2) || '',
      o.status || '',
      o.paymentMethod || '',
      o.customerInfo?.notes || '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siraj-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter
  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchSearch = !searchTerm ||
      o.customerInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerInfo?.phone?.includes(searchTerm) ||
      o._id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total:     orders.length,
    pending:   orders.filter(o => o.status === 'Pending').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    revenue:   orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0),
  };

  const s = {
    card: { background: '#fff', borderRadius: '16px', border: '1px solid #fce7f3', boxShadow: '0 2px 16px rgba(190,24,93,0.06)', padding: '24px', marginBottom: '20px' },
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' },
    statCard: (bg, border) => ({ background: bg, border: `1px solid ${border}`, borderRadius: '14px', padding: '18px 20px' }),
    statLabel: { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MID, marginBottom: '6px' },
    statNum: { fontSize: '1.9rem', fontWeight: 700, color: DARK, lineHeight: 1 },
    topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' },
    title: { fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 700, color: DARK },
    input: { padding: '9px 14px', border: '1.5px solid #f9a8d4', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', fontFamily: 'Montserrat,sans-serif', color: DARK, width: '200px' },
    select: { padding: '9px 14px', border: '1.5px solid #f9a8d4', borderRadius: '10px', fontSize: '0.88rem', outline: 'none', fontFamily: 'Montserrat,sans-serif', color: DARK, cursor: 'pointer', background: '#fff' },
    btn: (bg) => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: bg, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.04em' }),
    th: { padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.1em', background: '#fdf2f8', whiteSpace: 'nowrap' },
    td: { padding: '13px 14px', fontSize: '0.85rem', color: MID, verticalAlign: 'middle', borderBottom: '1px solid #fce7f3' },
    tdBold: { padding: '13px 14px', fontSize: '0.88rem', fontWeight: 700, color: DARK, verticalAlign: 'middle', borderBottom: '1px solid #fce7f3' },
    iconBtn: (color) => ({ background: 'none', border: 'none', cursor: 'pointer', color, padding: '5px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', transition: 'background 0.2s' }),
    badge: (st) => {
      const style = STATUS_STYLES[st] || { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };
      return { background: style.bg, color: style.color, border: `1px solid ${style.border}`, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 };
    },
    statusSelect: (st) => {
      const style = STATUS_STYLES[st] || {};
      return { padding: '5px 8px', borderRadius: '8px', border: `1px solid ${style.border || '#d1d5db'}`, background: style.bg || '#f3f4f6', color: style.color || '#6b7280', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'Montserrat,sans-serif' };
    },
  };

  return (
    <div>
      {/* Stats */}
      <div style={s.statGrid}>
        <div style={s.statCard('#fce7f3', '#f9a8d4')}>
          <div style={s.statLabel}>Total Orders</div>
          <div style={s.statNum}>{stats.total}</div>
        </div>
        <div style={s.statCard('#fef9c3', '#fde047')}>
          <div style={s.statLabel}>Pending</div>
          <div style={s.statNum}>{stats.pending}</div>
        </div>
        <div style={s.statCard('#dcfce7', '#86efac')}>
          <div style={s.statLabel}>Delivered</div>
          <div style={s.statNum}>{stats.delivered}</div>
        </div>
        <div style={s.statCard('#dbeafe', '#93c5fd')}>
          <div style={s.statLabel}>Revenue</div>
          <div style={{ ...s.statNum, fontSize: '1.4rem' }}>EGP {stats.revenue.toFixed(0)}</div>
        </div>
      </div>

      {/* Main card */}
      <div style={s.card}>
        <div style={s.topBar}>
          <div style={s.title}>All Orders</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              style={s.input}
              placeholder="Search name, phone, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All</option>
              {Object.keys(STATUS_STYLES).map(st => <option key={st}>{st}</option>)}
            </select>
            <button style={s.btn('linear-gradient(135deg,#25d366,#1ebe5d)')} onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>
            <button style={s.btn(`linear-gradient(135deg,${ROSE},#9d174d)`)} onClick={fetchOrders}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {message && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            {message}
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: ROSE }} />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: MID, fontStyle: 'italic' }}>No orders found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Order ID', 'Date', 'Customer', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order._id} style={{ background: '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = PALE}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={s.tdBold}>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>#{order._id.slice(-8)}</div>
                    </td>
                    <td style={s.td}>{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, color: DARK }}>{order.customerInfo?.name || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{order.customerInfo?.phone || ''}</div>
                    </td>
                    <td style={s.td}>
                      {order.items?.slice(0, 2).map((item, i) => (
                        <div key={i} style={{ fontSize: '0.78rem' }}>{item.name} ×{item.quantity}</div>
                      ))}
                      {order.items?.length > 2 && <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>+{order.items.length - 2} more</div>}
                    </td>
                    <td style={{ ...s.tdBold, color: ROSE }}>{order.totalAmount?.toFixed(2)} EGP</td>
                    <td style={s.td}>
                      <select
                        style={s.statusSelect(order.status)}
                        value={order.status}
                        onChange={e => handleUpdateStatus(order._id, e.target.value)}
                        disabled={isSubmitting}
                      >
                        {Object.keys(STATUS_STYLES).map(st => <option key={st}>{st}</option>)}
                      </select>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button style={s.iconBtn(MID)} title="View Details" onClick={() => setViewingOrder(order)}>
                          <Eye size={15} />
                        </button>
                        <button style={s.iconBtn('#25d366')} title="WhatsApp Customer" onClick={() => openWhatsApp(order)}>
                          <Phone size={15} />
                        </button>
                        <button style={s.iconBtn(ROSE)} title="Print Invoice" onClick={() => printInvoice(order)}>
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setViewingOrder(null)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #fce7f3' }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 700, color: DARK }}>
                  Order #{viewingOrder._id.slice(-8)}
                </div>
                <div style={{ fontSize: '0.78rem', color: MID, marginTop: '2px' }}>
                  {new Date(viewingOrder.createdAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...s.btn('#25d366'), padding: '8px 14px' }} onClick={() => openWhatsApp(viewingOrder)}>
                  <Phone size={14} /> WhatsApp
                </button>
                <button style={{ ...s.btn(ROSE), padding: '8px 14px' }} onClick={() => printInvoice(viewingOrder)}>
                  <Printer size={14} /> Print
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: MID, padding: '4px' }} onClick={() => setViewingOrder(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Status badge + update */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={s.badge(viewingOrder.status)}>{viewingOrder.status}</span>
              <select
                style={s.statusSelect(viewingOrder.status)}
                value={viewingOrder.status}
                onChange={e => handleUpdateStatus(viewingOrder._id, e.target.value)}
                disabled={isSubmitting}
              >
                {Object.keys(STATUS_STYLES).map(st => <option key={st}>{st}</option>)}
              </select>
            </div>

            {/* Customer info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Customer', value: viewingOrder.customerInfo?.name },
                { label: 'Phone', value: viewingOrder.customerInfo?.phone },
                { label: 'Email', value: viewingOrder.customerInfo?.email },
                { label: 'Payment', value: viewingOrder.paymentMethod },
                { label: 'Address', value: `${viewingOrder.customerInfo?.address || ''}, ${viewingOrder.customerInfo?.city || ''}`, span: true },
                viewingOrder.customerInfo?.notes && { label: 'Notes', value: viewingOrder.customerInfo.notes, span: true },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ background: PALE, borderRadius: '10px', padding: '12px 14px', gridColumn: item.span ? '1 / -1' : undefined }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MID, marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.88rem', color: DARK, fontWeight: 500 }}>{item.value || '—'}</div>
                </div>
              ))}
            </div>

            {/* Items */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: MID, marginBottom: '10px' }}>Items</div>
              {viewingOrder.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #fce7f3', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: DARK }}>{item.name}</span>
                    {item.variantName && <span style={{ color: MID, fontSize: '0.8rem' }}> · {item.variantName}</span>}
                    {item.customization?.length > 0 && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>{item.customization.join(', ')}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: MID }}>×{item.quantity}</span>
                    <span style={{ marginLeft: '12px', fontWeight: 700, color: ROSE }}>{(item.price * item.quantity).toFixed(2)} EGP</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ background: PALE, borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: MID, marginBottom: '6px' }}>
                <span>Subtotal</span><span>{viewingOrder.subtotal?.toFixed(2) || viewingOrder.totalAmount?.toFixed(2)} EGP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: MID, marginBottom: '8px' }}>
                <span>Shipping</span><span>{viewingOrder.shippingFee?.toFixed(2) || '0.00'} EGP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: DARK, borderTop: '1px solid #f9a8d4', paddingTop: '8px' }}>
                <span>Total</span><span style={{ color: ROSE }}>{viewingOrder.totalAmount?.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OrderManager;