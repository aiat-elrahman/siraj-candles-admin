import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, Save, ChevronDown, ChevronUp, Plus, Minus, AlertTriangle, CheckCircle, Filter } from 'lucide-react';

const API   = 'https://siraj-backend.onrender.com';
const DARK  = '#1E1023';
const ROSE  = '#BE185D';
const PINK  = '#F472B6';
const MID   = '#6B4A6E';
const LIGHT = '#D8B4D8';
const CREAM = '#FCE7F3';
const PALE  = '#FFF0F6';

// ─────────────────────────────────────────────────────────────────────────────
export default function StockManager() {
  const token = localStorage.getItem('adminToken');

  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState({}); // { productId: true/false }
  const [saveAll,     setSaveAll]     = useState(false);
  const [toast,       setToast]       = useState('');
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('All');
  const [filterStock, setFilterStock] = useState('All'); // All / Low / Out
  const [expanded,    setExpanded]    = useState({});    // { productId: bool }
  const [changes,     setChanges]     = useState({});    // { productId: { stock?, variants: { variantName: stock } } }
  const [categories,  setCategories]  = useState([]);

  const changesRef = useRef(changes);
  changesRef.current = changes;

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  // ── Fetch all products ────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setChanges({});
    try {
      const res  = await fetch(`${API}/api/products?limit=1000&status=Active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const list = data.results || [];
      setProducts(list);
      const cats = [...new Set(list.map(p => p.category).filter(Boolean))].sort();
      setCategories(cats);
    } catch (e) {
      showToast('❌ Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Track a change ────────────────────────────────────────────────────────
  const markChange = (productId, field, value) => {
    setChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      }
    }));
  };

  const markVariantChange = (productId, variantName, value) => {
    setChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        variants: {
          ...(prev[productId]?.variants || {}),
          [variantName]: value,
        }
      }
    }));
  };

  // ── Save a single product ─────────────────────────────────────────────────
  const saveProduct = async (product) => {
    const pid     = product._id;
    const change  = changesRef.current[pid];
    if (!change) return; // nothing changed

    setSaving(prev => ({ ...prev, [pid]: true }));
    try {
      // Build updated product data
      const updatedVariants = (product.variants || []).map(v => ({
        ...v,
        stock: change.variants?.[v.variantName] !== undefined
          ? parseInt(change.variants[v.variantName]) || 0
          : v.stock,
      }));

      // If has variants, sync main stock to sum of variants
      const newMainStock = updatedVariants.length > 0
        ? updatedVariants.reduce((s, v) => s + (v.stock || 0), 0)
        : (change.stock !== undefined ? parseInt(change.stock) || 0 : product.stock);

      // We need to send full productData as the endpoint expects
      const productData = {
        ...product,
        stock:    newMainStock,
        variants: updatedVariants,
        existingImagePaths: product.imagePaths || [],
      };

      const formData = new FormData();
      formData.append('productData', JSON.stringify(productData));

      const res = await fetch(`${API}/api/products/${pid}`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });

      if (!res.ok) throw new Error('Save failed');

      // Update local state
      setProducts(prev => prev.map(p => {
        if (p._id !== pid) return p;
        return { ...p, stock: newMainStock, variants: updatedVariants };
      }));

      // Clear changes for this product
      setChanges(prev => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });

      showToast(`✅ ${product.name_en || product.bundleName || product.name} saved`);
    } catch (e) {
      showToast(`❌ Failed to save — ${e.message}`);
    } finally {
      setSaving(prev => ({ ...prev, [pid]: false }));
    }
  };

  // ── Save ALL changed products ─────────────────────────────────────────────
  const saveAllChanges = async () => {
    const changedIds = Object.keys(changesRef.current);
    if (changedIds.length === 0) { showToast('No changes to save.'); return; }
    setSaveAll(true);
    for (const pid of changedIds) {
      const product = products.find(p => p._id === pid);
      if (product) await saveProduct(product);
    }
    setSaveAll(false);
    showToast(`✅ All changes saved!`);
  };

  // ── Quick add helper ──────────────────────────────────────────────────────
  const quickAdd = (product, amount) => {
    const currentStock = changesRef.current[product._id]?.stock !== undefined
      ? parseInt(changesRef.current[product._id].stock)
      : (product.stock || 0);
    markChange(product._id, 'stock', Math.max(0, currentStock + amount));
  };

  const quickAddVariant = (product, variantName, currentStock, amount) => {
    const cur = changesRef.current[product._id]?.variants?.[variantName] !== undefined
      ? parseInt(changesRef.current[product._id].variants[variantName])
      : (currentStock || 0);
    markVariantChange(product._id, variantName, Math.max(0, cur + amount));
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const name = (p.name_en || p.bundleName || p.name || '').toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterCat !== 'All' && p.category !== filterCat) return false;

    if (filterStock === 'Out') {
      const totalStock = p.variants?.length > 0
        ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
        : (p.stock || 0);
      return totalStock === 0;
    }
    if (filterStock === 'Low') {
      const totalStock = p.variants?.length > 0
        ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
        : (p.stock || 0);
      return totalStock > 0 && totalStock <= 5;
    }
    return true;
  });

  const changedCount = Object.keys(changes).length;

  // ── Input style ───────────────────────────────────────────────────────────
  const numInput = (value, onChange, onBlur) => (
    <input
      type="number" min="0" value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      style={{
        width: 68, padding: '5px 8px', border: `1.5px solid ${CREAM}`,
        borderRadius: 7, fontSize: 13, fontWeight: 700,
        fontFamily: 'Montserrat, sans-serif', color: DARK,
        outline: 'none', textAlign: 'center',
        background: value !== undefined ? PALE : '#fff',
      }}
    />
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', color: DARK }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13,
          background: toast.startsWith('✅') ? '#d1fae5' : '#fee2e2',
          color: toast.startsWith('✅') ? '#065f46' : '#991b1b',
          border: toast.startsWith('✅') ? '1px solid #bbf7d0' : '1px solid #fecaca',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>{toast}</div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, margin: 0, color: DARK }}>
            📦 Quick Stock Manager
          </h1>
          <p style={{ fontSize: 12, color: MID, marginTop: 3 }}>
            Edit stock inline · Auto-saves on blur · Or save all at once
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {changedCount > 0 && (
            <button onClick={saveAllChanges} disabled={saveAll} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${ROSE}, #9d174d)`,
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              boxShadow: '0 4px 12px rgba(190,24,93,0.3)',
            }}>
              {saveAll
                ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                : <><Save size={14} /> Save All ({changedCount} changed)</>
              }
            </button>
          )}
          <button onClick={fetchProducts} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', background: '#fff',
            border: `1px solid ${CREAM}`, borderRadius: 10,
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: MID,
            fontFamily: 'Montserrat, sans-serif',
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap',
        alignItems: 'center', background: '#fff',
        border: `1px solid ${CREAM}`, borderRadius: 12, padding: '12px 16px',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, color: MID }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              border: `1.5px solid ${CREAM}`, borderRadius: 8, fontSize: 12,
              fontFamily: 'Montserrat, sans-serif', color: DARK, outline: 'none',
              boxSizing: 'border-box',
            }} />
        </div>

        {/* Category filter */}
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{
          padding: '8px 12px', border: `1.5px solid ${CREAM}`, borderRadius: 8,
          fontSize: 12, fontFamily: 'Montserrat, sans-serif', color: DARK, outline: 'none',
        }}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Stock filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['All', ''], ['Out', '🔴 Out of Stock'], ['Low', '⚠️ Low Stock']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStock(val)} style={{
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 11, fontFamily: 'Montserrat, sans-serif',
              background: filterStock === val ? ROSE : CREAM,
              color: filterStock === val ? '#fff' : MID,
            }}>
              {label || 'All'}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 11, color: MID, marginLeft: 'auto' }}>
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Products table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <RefreshCw size={32} color={ROSE} style={{ animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: MID, fontSize: 13, marginTop: 12 }}>Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: MID, fontSize: 13, fontStyle: 'italic' }}>
          No products match your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredProducts.map(product => {
            const pid        = product._id;
            const hasVariants = product.variants && product.variants.length > 0;
            const isExpanded  = expanded[pid];
            const isSaving    = saving[pid];
            const isDirty     = !!changes[pid];
            const name        = product.name_en || product.bundleName || product.name;

            // Display stock (prefer pending change, fallback to product)
            const displayMainStock = changes[pid]?.stock !== undefined
              ? changes[pid].stock
              : product.stock;

            const totalVariantStock = hasVariants
              ? product.variants.reduce((s, v) => s + (v.stock || 0), 0)
              : null;

            const effectiveStock = hasVariants ? totalVariantStock : (product.stock || 0);
            const isOut  = effectiveStock === 0;
            const isLow  = effectiveStock > 0 && effectiveStock <= 5;

            return (
              <div key={pid} style={{
                background: '#fff', borderRadius: 12,
                border: `1.5px solid ${isDirty ? PINK : isOut ? '#fecaca' : isLow ? '#fef3c7' : CREAM}`,
                overflow: 'hidden',
                boxShadow: isDirty ? `0 2px 12px rgba(190,24,93,0.1)` : '0 1px 4px rgba(30,16,35,0.05)',
              }}>
                {/* ── Product row ── */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, flexWrap: 'wrap' }}>

                  {/* Thumbnail */}
                  {product.imagePaths?.[0]
                    ? <img src={product.imagePaths[0]} alt={name}
                        style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 8, background: CREAM, flexShrink: 0 }} />
                  }

                  {/* Name + category */}
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: DARK }}>{name}</p>
                    <p style={{ fontSize: 10, color: MID, margin: '2px 0 0' }}>
                      {product.category}{product.subcategory ? ` › ${product.subcategory}` : ''}
                      {hasVariants && ` · ${product.variants.length} variants`}
                    </p>
                  </div>

                  {/* Stock badge */}
                  {isOut && (
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#dc2626', flexShrink: 0 }}>
                      🔴 Out of Stock
                    </span>
                  )}
                  {isLow && (
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', flexShrink: 0 }}>
                      ⚠️ Only {effectiveStock} left
                    </span>
                  )}

                  {/* Stock control — simple products */}
                  {!hasVariants && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {/* Quick add buttons */}
                      {[1, 2, 5].map(n => (
                        <button key={n} onClick={() => { quickAdd(product, n); setTimeout(() => saveProduct(product), 200); }}
                          style={{
                            padding: '4px 8px', borderRadius: 6, border: `1px solid ${CREAM}`,
                            background: PALE, color: ROSE, fontSize: 10, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                          }}>+{n}</button>
                      ))}
                      <button onClick={() => { quickAdd(product, -1); }}
                        style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${CREAM}`, background: PALE, color: MID, fontSize: 10, cursor: 'pointer' }}>
                        <Minus size={10} />
                      </button>
                      <input
                        type="number" min="0"
                        value={displayMainStock}
                        onChange={e => markChange(pid, 'stock', e.target.value)}
                        onBlur={() => saveProduct(product)}
                        style={{
                          width: 64, padding: '6px 8px',
                          border: `1.5px solid ${isDirty ? ROSE : CREAM}`,
                          borderRadius: 8, fontSize: 14, fontWeight: 800,
                          fontFamily: 'Montserrat, sans-serif', color: DARK,
                          outline: 'none', textAlign: 'center',
                          background: isDirty ? PALE : '#fff',
                        }}
                      />
                      <button onClick={() => { quickAdd(product, 1); }}
                        style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${CREAM}`, background: PALE, color: MID, fontSize: 10, cursor: 'pointer' }}>
                        <Plus size={10} />
                      </button>
                    </div>
                  )}

                  {/* Variant total display + expand toggle */}
                  {hasVariants && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isOut ? '#dc2626' : isLow ? '#d97706' : DARK }}>
                        {totalVariantStock} total
                      </span>
                      <button onClick={() => setExpanded(prev => ({ ...prev, [pid]: !isExpanded }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8,
                          border: `1px solid ${CREAM}`, background: isExpanded ? CREAM : '#fff',
                          cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          color: ROSE, fontFamily: 'Montserrat, sans-serif',
                        }}>
                        {isExpanded ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> Edit Variants</>}
                      </button>
                    </div>
                  )}

                  {/* Save button (shows when dirty) */}
                  {isDirty && (
                    <button onClick={() => saveProduct(product)} disabled={isSaving} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      background: `linear-gradient(135deg, ${ROSE}, #9d174d)`,
                      color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif', flexShrink: 0,
                    }}>
                      {isSaving
                        ? <RefreshCw size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
                        : <Save size={12} />}
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>

                {/* ── Variant rows (expanded) ── */}
                {hasVariants && isExpanded && (
                  <div style={{ borderTop: `1px solid ${CREAM}`, background: PALE, padding: '10px 16px 14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                      {product.variants.map(variant => {
                        const vName    = variant.variantName;
                        const vDirty   = changes[pid]?.variants?.[vName] !== undefined;
                        const vDisplay = vDirty ? changes[pid].variants[vName] : variant.stock;
                        const vIsOut   = (variant.stock || 0) === 0;
                        const vIsLow   = (variant.stock || 0) > 0 && (variant.stock || 0) <= 3;

                        return (
                          <div key={vName} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: '#fff', borderRadius: 8, padding: '8px 12px',
                            border: `1px solid ${vDirty ? PINK : vIsOut ? '#fecaca' : vIsLow ? '#fef3c7' : CREAM}`,
                          }}>
                            {/* Variant name */}
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: DARK }}>{vName}</p>
                              <p style={{ fontSize: 10, color: MID, margin: '1px 0 0' }}>
                                {variant.price?.toFixed(2)} EGP
                                {vIsOut && <span style={{ color: '#dc2626', marginLeft: 6 }}>🔴 Out</span>}
                                {vIsLow && <span style={{ color: '#d97706', marginLeft: 6 }}>⚠️ Low</span>}
                              </p>
                            </div>

                            {/* Quick add for variant */}
                            {[1, 2].map(n => (
                              <button key={n}
                                onClick={() => { quickAddVariant(product, vName, variant.stock, n); setTimeout(() => saveProduct(product), 200); }}
                                style={{
                                  padding: '3px 7px', borderRadius: 5, border: `1px solid ${CREAM}`,
                                  background: PALE, color: ROSE, fontSize: 10, fontWeight: 700,
                                  cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                                }}>+{n}</button>
                            ))}

                            {/* Stock input */}
                            <input
                              type="number" min="0"
                              value={vDisplay}
                              onChange={e => markVariantChange(pid, vName, e.target.value)}
                              onBlur={() => saveProduct(product)}
                              style={{
                                width: 60, padding: '5px 7px',
                                border: `1.5px solid ${vDirty ? ROSE : CREAM}`,
                                borderRadius: 7, fontSize: 13, fontWeight: 800,
                                fontFamily: 'Montserrat, sans-serif', color: DARK,
                                outline: 'none', textAlign: 'center',
                                background: vDirty ? PALE : '#fff',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Save variants button */}
                    {changes[pid]?.variants && Object.keys(changes[pid].variants).length > 0 && (
                      <button onClick={() => saveProduct(product)} disabled={isSaving}
                        style={{
                          marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 18px', borderRadius: 8, border: 'none',
                          background: `linear-gradient(135deg, ${ROSE}, #9d174d)`,
                          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'Montserrat, sans-serif',
                        }}>
                        {isSaving
                          ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                          : <><Save size={13} /> Save All Variant Changes</>}
                      </button>
                    )}
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