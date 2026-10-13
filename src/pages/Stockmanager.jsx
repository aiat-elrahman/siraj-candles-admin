import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronDown, ChevronUp, Save } from 'lucide-react';

const API = 'https://siraj-backend.onrender.com';
const DARK  = '#1E1023';
const ROSE  = '#BE185D';
const PINK  = '#F472B6';
const MID   = '#6B4A6E';
const LIGHT = '#D8B4D8';
const CREAM = '#FCE7F3';
const PALE  = '#FFF0F6';

// Location colours
const LOC_COLORS = {
  online: { bg: '#fce7f3', border: '#f472b6', text: '#be185d', label: '🖥️ Online' },
  sabeel: { bg: '#dcfce7', border: '#86efac', text: '#15803d', label: '🏪 Sabeel' },
  clouds_tex: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', label: '☁️ Clouds Tex' }
};

export default function StockManager({ readOnly = false, userStore = null }) {
  const token = localStorage.getItem('adminToken');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Which locations to show
  const locationsToShow = userStore ? [userStore] : ['online', 'sabeel', 'clouds_tex'];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/products?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(data.results || []);
    } catch (e) {
      showToast('❌ Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateStock = async (productId, variantName, location, newValue) => {
    if (readOnly) return;
    const value = parseInt(newValue) || 0;
    setSaving(prev => ({ ...prev, [productId+'_'+variantName+'_'+location]: true }));
    try {
      const body = variantName
        ? { variantName, [location]: value }
        : { [location]: value };
      const res = await fetch(`${API}/api/products/${productId}/location-stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Update failed');
      showToast(`✅ Stock updated`);
    } catch (err) {
      showToast(`❌ ${err.message}`);
      fetchProducts(); // revert on error
    } finally {
      setSaving(prev => {
        const newState = { ...prev };
        delete newState[productId+'_'+variantName+'_'+location];
        return newState;
      });
    }
  };

  const getStock = (product, variantName, location) => {
    if (variantName) {
      const variant = product.variants?.find(v => v.variantName === variantName);
      if (!variant) return 0;
      switch(location) {
        case 'online': return variant.stockOnline ?? variant.stock ?? 0;
        case 'sabeel': return variant.stockSabeel ?? 0;
        case 'clouds_tex': return variant.stockCloudsTex ?? 0;
        default: return 0;
      }
    } else {
      switch(location) {
        case 'online': return product.stockOnline ?? product.stock ?? 0;
        case 'sabeel': return product.stockSabeel ?? 0;
        case 'clouds_tex': return product.stockCloudsTex ?? 0;
        default: return 0;
      }
    }
  };

  const totalStock = (product, variantName) => {
    return locationsToShow.reduce((sum, loc) => sum + getStock(product, variantName, loc), 0);
  };

  const filteredProducts = products.filter(p => {
    const name = (p.name_en || p.bundleName || p.name || '').toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    // If filtering by a specific location (employee view), only show products with stock >0 in that location
    if (userStore) {
      const hasStock = (prod, variantName) => getStock(prod, variantName, userStore) > 0;
      if (p.variants?.length) {
        return p.variants.some(v => hasStock(p, v.variantName));
      } else {
        return hasStock(p, null);
      }
    }
    return true;
  });

 const renderStockInput = (product, variantName, location) => {
    const value = getStock(product, variantName, location);
    const colors = LOC_COLORS[location];
    const savingKey = product._id + '_' + (variantName || '') + '_' + location;
    const isSaving = saving[savingKey];

    return (
      <div style={{ textAlign: 'center', minWidth: 80 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.text, marginBottom: 4 }}>{colors.label}</div>
        <div style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: '4px 8px',
          display: 'inline-block'
        }}>
          <input
            type="number"
            min="0"
            value={value}
            onChange={(e) => {
              if (readOnly) return;
              const newVal = e.target.value;
              
              // FIX: Map the UI location to the actual database property name
              const dbField = location === 'online' ? 'stockOnline' : location === 'sabeel' ? 'stockSabeel' : 'stockCloudsTex';

              // optimistic update
              setProducts(prev => prev.map(p => {
                if (p._id !== product._id) return p;
                if (variantName) {
                  const newVariants = p.variants.map(v => v.variantName === variantName ? { ...v, [dbField]: parseInt(newVal) || 0 } : v);
                  return { ...p, variants: newVariants };
                } else {
                  return { ...p, [dbField]: parseInt(newVal) || 0 };
                }
              }));
            }}
            onBlur={(e) => !readOnly && updateStock(product._id, variantName, location, e.target.value)}
            style={{
              width: 70,
              padding: '6px 0',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: colors.text
            }}
            disabled={readOnly || isSaving}
          />
        </div>
        {isSaving && <div style={{ fontSize: '0.6rem', color: colors.text }}>saving...</div>}
        {readOnly && <div style={{ fontSize: '0.6rem', color: colors.text }}>read only</div>}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', color: DARK, paddingBottom: 40 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          padding: '10px 18px', borderRadius: 10, fontWeight: 700,
          background: toast.startsWith('✅') ? '#d1fae5' : '#fee2e2',
          color: toast.startsWith('✅') ? '#065f46' : '#991b1b',
          border: toast.startsWith('✅') ? '1px solid #bbf7d0' : '1px solid #fecaca',
        }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, margin: 0, color: DARK }}>
            📦 Stock Manager {userStore ? `– ${userStore === 'sabeel' ? 'Sabeel Elrashad' : 'Clouds Tex'}` : '(All Locations)'}
          </h1>
          <p style={{ fontSize: 12, color: MID }}>
            {readOnly ? 'View only' : 'Edit stock inline'} · Total stock = sum of shown locations
          </p>
        </div>
        <button onClick={fetchProducts} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 14px', background: '#fff', border: `1px solid ${CREAM}`,
          borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: MID,
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20,
        alignItems: 'center', background: '#fff', border: `1px solid ${CREAM}`,
        borderRadius: 12, padding: '12px 16px'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, color: MID }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: MID }}>No products match.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredProducts.map(product => {
            const hasVariants = product.variants && product.variants.length > 0;
            const isExpanded = expanded[product._id];
            const total = totalStock(product, null);
            return (
              <div key={product._id} style={{
                background: '#fff', borderRadius: 12, border: `1px solid ${CREAM}`,
                overflow: 'hidden', boxShadow: '0 1px 4px rgba(30,16,35,0.05)'
              }}>
                {/* Product header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, flexWrap: 'wrap' }}>
                  {product.imagePaths?.[0] && (
                    <img src={product.imagePaths[0]} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: DARK }}>{product.name_en || product.bundleName || product.name}</div>
                    <div style={{ fontSize: 11, color: MID }}>{product.category}{product.subcategory ? ` › ${product.subcategory}` : ''}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: ROSE, background: PALE, padding: '4px 12px', borderRadius: 20 }}>
                    Total: {total}
                  </div>
                  {hasVariants && (
                    <button onClick={() => setExpanded(prev => ({ ...prev, [product._id]: !isExpanded }))} style={{
                      padding: '6px 12px', borderRadius: 8, border: `1px solid ${CREAM}`,
                      background: isExpanded ? CREAM : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: ROSE
                    }}>
                      {isExpanded ? 'Hide Variants' : `Show ${product.variants.length} Variants`}
                    </button>
                  )}
                </div>

                {/* Simple product stock columns */}
                {!hasVariants && (
                  <div style={{ padding: '12px 16px', borderTop: `1px solid ${CREAM}`, background: PALE, display: 'flex', justifyContent: 'space-around', gap: 12 }}>
                    {locationsToShow.map(loc => renderStockInput(product, null, loc))}
                  </div>
                )}

                {/* Variants expandable section */}
                {hasVariants && isExpanded && (
                  <div style={{ borderTop: `1px solid ${CREAM}`, background: '#fffafc', padding: '16px' }}>
                    {product.variants.map(variant => {
                      const varTotal = locationsToShow.reduce((sum, loc) => sum + getStock(product, variant.variantName, loc), 0);
                      return (
                        <div key={variant.variantName} style={{
                          marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${CREAM}`,
                          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16
                        }}>
                          <div style={{ width: 140, fontWeight: 700, color: DARK }}>{variant.variantName}</div>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', gap: 12 }}>
                            {locationsToShow.map(loc => renderStockInput(product, variant.variantName, loc))}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: ROSE, minWidth: 80, textAlign: 'right' }}>
                            Total: {varTotal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}