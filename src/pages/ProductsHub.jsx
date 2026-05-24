
import React, { useState } from 'react';
import ProductManager from './ProductManager';
import StockManager from './Stockmanager';
import CareManager from './CareManager';
import BulkUploadManager from './BulkUploadManager';

// ── Design tokens ─────────────────────────────────────────────────────────────
const DARK  = '#1E1023';
const ROSE  = '#BE185D';
const PINK  = '#F472B6';
const MID   = '#6B4A6E';
const LIGHT = '#D8B4D8';
const CREAM = '#FCE7F3';
const PALE  = '#FFF0F6';

const TABS = [
  { id: 'add',   label: '➕ Add Product',      desc: 'Create a new single product or bundle' },
  { id: 'manage',label: '🗂️ Manage Products',  desc: 'Edit, delete, and view all products' },
  { id: 'stock', label: '📦 Stock',             desc: 'Quick stock updates across all products' },
  { id: 'care',  label: '🫧 Product Care',      desc: 'Manage care instructions by category' },
  { id: 'bulk',  label: '⬆️ Bulk Upload',       desc: 'Import multiple products via CSV' },
];

export default function ProductsHub() {
  const [activeTab, setActiveTab] = useState('manage');

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', color: DARK }}>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap',
        marginBottom: 22, padding: '14px 18px',
        background: '#fff', borderRadius: 14,
        border: `1px solid ${CREAM}`,
        boxShadow: '0 2px 10px rgba(190,24,93,0.05)',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.desc}
              style={{
                padding: '9px 18px', borderRadius: 10, border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
                background: isActive
                  ? `linear-gradient(135deg, ${ROSE}, #9d174d)`
                  : PALE,
                color: isActive ? '#fff' : MID,
                boxShadow: isActive ? '0 4px 12px rgba(190,24,93,0.25)' : 'none',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Active tab description ── */}
      <p style={{ fontSize: 11, color: LIGHT, marginBottom: 16, marginLeft: 2, fontStyle: 'italic' }}>
        {TABS.find(t => t.id === activeTab)?.desc}
      </p>

      {/* ── Tab content ── */}
      <div>
        {activeTab === 'add' && (
          // Pass a prop to tell ProductManager to start in "add new" mode
          // and hide the product list
          <ProductManagerAddOnly />
        )}
        {activeTab === 'manage' && (
          <ProductManagerListOnly />
        )}
        {activeTab === 'stock'  && <StockManager />}
        {activeTab === 'care'   && <CareManager />}
        {activeTab === 'bulk'   && <BulkUploadManager />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thin wrappers that render ProductManager in different modes
// ProductManager already handles both add and list — we control which section
// is visible by passing a mode prop and CSS hiding the other half
// ─────────────────────────────────────────────────────────────────────────────

function ProductManagerAddOnly() {
  return (
    <div>
      <style>{`
        .pm-list-section   { display: none !important; }
        .pm-form-section   { display: block !important; }
      `}</style>
      <ProductManager initialMode="add" />
    </div>
  );
}

function ProductManagerListOnly() {
  return (
    <div>
      <style>{`
        .pm-form-section   { display: none !important; }
        .pm-list-section   { display: block !important; }
      `}</style>
      <ProductManager initialMode="list" />
    </div>
  );
}
