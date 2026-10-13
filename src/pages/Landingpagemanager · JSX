import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';
const SITE_URL = 'https://sirajcare.com';

const DARK = '#1E1023';
const ROSE = '#BE185D';
const MID = '#6B4A6E';
const LIGHT = '#D8B4D8';
const PALE = '#FFF0F6';

const emptyPage = () => ({
  slug: '', internalName: '', isPublished: false,
  metaTitle: '', metaDescription: '',
  eyebrow: '', headline: '', subheadline: '', heroImage: '', offerBadge: '', ctaText: 'Shop Now',
  productsHeading: '', productIds: [],
  benefits: [], reviews: [],
  howItWorksEnabled: true, howItWorksHeading: 'How ordering works', howItWorksSteps: [],
  faq: [], contentName: ''
});

const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2';
const labelCls = 'block text-xs font-semibold mb-1 uppercase tracking-wide';

const Toast = ({ message, type }) => {
  if (!message) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white font-medium ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {message}
    </div>
  );
};

const Field = ({ label, children, hint }) => (
  <div className="mb-4">
    <label className={labelCls} style={{ color: MID }}>{label}</label>
    {children}
    {hint && <p className="text-xs mt-1" style={{ color: MID }}>{hint}</p>}
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-sm border p-6 mb-6" style={{ borderColor: LIGHT }}>
    <h3 className="text-lg font-bold mb-4" style={{ color: DARK }}>{title}</h3>
    {children}
  </div>
);

const LandingPageManager = () => {
  const token = localStorage.getItem('adminToken');
  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);     // page object being edited (has _id if saved)
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [uploading, setUploading] = useState(false);

  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productInfo, setProductInfo] = useState({}); // id -> { name, image }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/landing`, { headers: authHeaders });
      if (!res.ok) throw new Error('load failed');
      setPages(await res.json());
    } catch { showToast('Could not load landing pages', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPages(); }, []); // eslint-disable-line

  // Resolve names/thumbnails for the product ids already on the page being edited
  useEffect(() => {
    if (!editing) return;
    const missing = (editing.productIds || []).filter(id => !productInfo[id]);
    if (!missing.length) return;
    (async () => {
      const found = {};
      await Promise.all(missing.map(async id => {
        try {
          const r = await fetch(`${API_BASE_URL}/api/products/${id}`);
          if (!r.ok) { found[id] = { name: '(product not found)', image: '' }; return; }
          const p = await r.json();
          found[id] = { name: p.name_en || p.bundleName || '(unnamed)', image: p.imagePaths?.[0] || '', hidden: !!p.hideFromShop };
        } catch { found[id] = { name: '(could not load)', image: '' }; }
      }));
      setProductInfo(prev => ({ ...prev, ...found }));
    })();
  }, [editing?.productIds]); // eslint-disable-line

  const set = (field, value) => setEditing(prev => ({ ...prev, [field]: value }));

  const setListItem = (field, index, key, value) =>
    setEditing(prev => ({ ...prev, [field]: prev[field].map((it, i) => i === index ? { ...it, [key]: value } : it) }));
  const addListItem = (field, blank) =>
    setEditing(prev => ({ ...prev, [field]: [...(prev[field] || []), blank] }));
  const removeListItem = (field, index) =>
    setEditing(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));

  const moveProduct = (index, dir) => {
    setEditing(prev => {
      const ids = [...prev.productIds];
      const j = index + dir;
      if (j < 0 || j >= ids.length) return prev;
      [ids[index], ids[j]] = [ids[j], ids[index]];
      return { ...prev, productIds: ids };
    });
  };

  const searchProducts = async (q) => {
    setProductQuery(q);
    if (q.trim().length < 2) { setProductResults([]); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?limit=20&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProductResults(data.results || []);
    } catch { /* ignore */ }
  };

  const addProduct = (p) => {
    if (editing.productIds.includes(p._id)) { showToast('Already on this page', 'error'); return; }
    setProductInfo(prev => ({ ...prev, [p._id]: { name: p.name_en || p.bundleName || '(unnamed)', image: p.imagePaths?.[0] || '' } }));
    set('productIds', [...editing.productIds, p._id]);
    setProductQuery(''); setProductResults([]);
  };

  const uploadHero = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.imageUrl) throw new Error('no url');
      set('heroImage', data.imageUrl);
      showToast('Image uploaded!');
    } catch { showToast('Image upload failed', 'error'); }
    finally { setUploading(false); }
  };

  const savePage = async () => {
    if (!editing.slug.trim()) { showToast('Add a URL slug first (e.g. wax-melts)', 'error'); return; }
    if (!editing.headline.trim()) { showToast('Add a headline', 'error'); return; }
    setSaving(true);
    try {
      const isNew = !editing._id;
      const res = await fetch(`${API_BASE_URL}/api/landing${isNew ? '' : `/${editing._id}`}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: authHeaders,
        body: JSON.stringify(editing)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.message || 'Save failed', 'error'); return; }
      setEditing(data);
      showToast('Landing page saved!');
      loadPages();
    } catch { showToast('Network error', 'error'); }
    finally { setSaving(false); }
  };

  const deletePage = async (page) => {
    if (!window.confirm(`Delete "${page.internalName || page.slug}"? Live ad links to it will stop working.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/landing/${page._id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error();
      showToast('Deleted');
      if (editing?._id === page._id) setEditing(null);
      loadPages();
    } catch { showToast('Delete failed', 'error'); }
  };

  const liveUrl = (slug) => `${SITE_URL}/landing.html?slug=${slug}`;
  const copyLink = async (slug) => {
    try { await navigator.clipboard.writeText(liveUrl(slug)); showToast('Link copied!'); }
    catch { showToast('Copy failed — select and copy it manually', 'error'); }
  };

  // ── List view ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div>
        <Toast {...toast} />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: DARK }}>Landing Pages</h2>
            <p className="text-sm" style={{ color: MID }}>One page per ad campaign. Point your Meta ad at the page link.</p>
          </div>
          <button onClick={() => setEditing(emptyPage())} className="px-5 py-2 rounded-lg text-white font-semibold" style={{ background: ROSE }}>
            + New Landing Page
          </button>
        </div>

        {loading ? <p style={{ color: MID }}>Loading…</p> : pages.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: LIGHT, color: MID }}>
            No landing pages yet. Create your first campaign page.
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map(p => (
              <div key={p._id} className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3" style={{ borderColor: LIGHT }}>
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold" style={{ color: DARK }}>{p.internalName || p.headline || p.slug}</p>
                  <p className="text-xs break-all" style={{ color: MID }}>{liveUrl(p.slug)}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: p.isPublished ? '#DCFCE7' : PALE, color: p.isPublished ? '#166534' : MID }}>
                  {p.isPublished ? 'Published' : 'Draft'}
                </span>
                <button onClick={() => copyLink(p.slug)} className="px-3 py-1 text-sm rounded-lg border" style={{ borderColor: LIGHT, color: MID }}>Copy link</button>
                <a href={liveUrl(p.slug)} target="_blank" rel="noreferrer" className="px-3 py-1 text-sm rounded-lg border" style={{ borderColor: LIGHT, color: MID }}>Preview</a>
                <button onClick={() => setEditing(p)} className="px-3 py-1 text-sm rounded-lg text-white" style={{ background: ROSE }}>Edit</button>
                <button onClick={() => deletePage(p)} className="px-3 py-1 text-sm rounded-lg border border-red-300 text-red-600">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Editor view ────────────────────────────────────────────────────────────
  return (
    <div>
      <Toast {...toast} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button onClick={() => { setEditing(null); loadPages(); }} className="text-sm font-semibold" style={{ color: ROSE }}>← Back to all pages</button>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: DARK }}>
            <input type="checkbox" checked={editing.isPublished} onChange={e => set('isPublished', e.target.checked)} />
            Published
          </label>
          <button onClick={savePage} disabled={saving} className="px-6 py-2 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: ROSE }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <Card title="Page address">
        <Field label="Internal name (only you see this)">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.internalName} onChange={e => set('internalName', e.target.value)} placeholder="Wax Melts – October campaign" />
        </Field>
        <Field label="URL slug" hint={editing.slug ? `Link: ${liveUrl(editing.slug)}` : 'Lowercase letters, numbers and dashes, e.g. wax-melts'}>
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.slug} onChange={e => set('slug', e.target.value)} placeholder="wax-melts" />
        </Field>
        <Field label="Browser tab title">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.metaTitle} onChange={e => set('metaTitle', e.target.value)} />
        </Field>
        <Field label="Short description (search / link preview)">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.metaDescription} onChange={e => set('metaDescription', e.target.value)} />
        </Field>
        <Field label="Name sent to Meta Pixel (ViewContent)" hint="Optional. Defaults to the headline.">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.contentName} onChange={e => set('contentName', e.target.value)} />
        </Field>
      </Card>

      <Card title="Hero (top of the page)">
        <Field label="Small line above headline">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.eyebrow} onChange={e => set('eyebrow', e.target.value)} />
        </Field>
        <Field label="Headline *">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.headline} onChange={e => set('headline', e.target.value)} />
        </Field>
        <Field label="Sub-headline">
          <textarea rows={2} className={inputCls} style={{ borderColor: LIGHT }} value={editing.subheadline} onChange={e => set('subheadline', e.target.value)} />
        </Field>
        <Field label="Offer badge" hint="e.g. the free-delivery threshold or a bundle saving. Leave empty to hide.">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.offerBadge} onChange={e => set('offerBadge', e.target.value)} />
        </Field>
        <Field label="Button text">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.ctaText} onChange={e => set('ctaText', e.target.value)} />
        </Field>
        <Field label="Background image">
          <div className="flex items-center gap-3">
            {editing.heroImage && <img src={editing.heroImage} alt="" className="w-20 h-14 object-cover rounded" />}
            <input type="file" accept="image/*" onChange={uploadHero} disabled={uploading} className="text-sm" />
            {uploading && <span className="text-xs" style={{ color: MID }}>Uploading…</span>}
            {editing.heroImage && <button onClick={() => set('heroImage', '')} className="text-xs text-red-600">Remove</button>}
          </div>
        </Field>
      </Card>

      <Card title="Products & bundles on this page">
        <Field label="Section heading">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.productsHeading} onChange={e => set('productsHeading', e.target.value)} />
        </Field>
        <Field label="Add a product or bundle" hint="Items that are hidden from the shop or sold out are skipped / shown as sold out automatically.">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={productQuery} onChange={e => searchProducts(e.target.value)} placeholder="Type at least 2 letters…" />
          {productResults.length > 0 && (
            <div className="border rounded-lg mt-1 max-h-60 overflow-y-auto bg-white" style={{ borderColor: LIGHT }}>
              {productResults.map(p => (
                <button key={p._id} onClick={() => addProduct(p)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-pink-50">
                  {p.imagePaths?.[0] && <img src={p.imagePaths[0]} alt="" className="w-8 h-8 object-cover rounded" />}
                  <span className="text-sm" style={{ color: DARK }}>{p.name_en || p.bundleName}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
        {editing.productIds.length === 0 ? (
          <p className="text-sm" style={{ color: MID }}>No products yet.</p>
        ) : (
          <div className="space-y-2">
            {editing.productIds.map((id, i) => (
              <div key={id} className="flex items-center gap-3 border rounded-lg p-2" style={{ borderColor: LIGHT }}>
                {productInfo[id]?.image && <img src={productInfo[id].image} alt="" className="w-10 h-10 object-cover rounded" />}
                <span className="flex-1 text-sm" style={{ color: DARK }}>
                  {productInfo[id]?.name || 'Loading…'}
                  {productInfo[id]?.hidden && <em className="text-xs text-red-600"> (hidden from shop — will not show)</em>}
                </span>
                <button onClick={() => moveProduct(i, -1)} disabled={i === 0} className="px-2 disabled:opacity-30" aria-label="Move up">↑</button>
                <button onClick={() => moveProduct(i, 1)} disabled={i === editing.productIds.length - 1} className="px-2 disabled:opacity-30" aria-label="Move down">↓</button>
                <button onClick={() => set('productIds', editing.productIds.filter((_, k) => k !== i))} className="px-2 text-red-600" aria-label="Remove">✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Benefits strip">
        {editing.benefits.map((b, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[140px_1fr_2fr_auto] gap-2 mb-2 items-center">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={b.icon} onChange={e => setListItem('benefits', i, 'icon', e.target.value)} placeholder="fa-leaf" />
            <input className={inputCls} style={{ borderColor: LIGHT }} value={b.title} onChange={e => setListItem('benefits', i, 'title', e.target.value)} placeholder="Title" />
            <input className={inputCls} style={{ borderColor: LIGHT }} value={b.text} onChange={e => setListItem('benefits', i, 'text', e.target.value)} placeholder="One short sentence" />
            <button onClick={() => removeListItem('benefits', i)} className="text-red-600 px-2">✕</button>
          </div>
        ))}
        <p className="text-xs mb-2" style={{ color: MID }}>Icon = a Font Awesome name like fa-leaf, fa-truck, fa-gift, fa-heart, fa-star.</p>
        <button onClick={() => addListItem('benefits', { icon: 'fa-heart', title: '', text: '' })} className="text-sm font-semibold" style={{ color: ROSE }}>+ Add benefit</button>
      </Card>

      <Card title="How ordering works (deposit → shipping label → balance)">
        <label className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: DARK }}>
          <input type="checkbox" checked={editing.howItWorksEnabled} onChange={e => set('howItWorksEnabled', e.target.checked)} />
          Show this section
        </label>
        <Field label="Heading">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={editing.howItWorksHeading} onChange={e => set('howItWorksHeading', e.target.value)} />
        </Field>
        {editing.howItWorksSteps.map((s, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 mb-2 items-center">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={s.title} onChange={e => setListItem('howItWorksSteps', i, 'title', e.target.value)} placeholder="Step title" />
            <input className={inputCls} style={{ borderColor: LIGHT }} value={s.text} onChange={e => setListItem('howItWorksSteps', i, 'text', e.target.value)} placeholder="What happens" />
            <button onClick={() => removeListItem('howItWorksSteps', i)} className="text-red-600 px-2">✕</button>
          </div>
        ))}
        <button onClick={() => addListItem('howItWorksSteps', { title: '', text: '' })} className="text-sm font-semibold" style={{ color: ROSE }}>+ Add step</button>
      </Card>

      <Card title="Customer reviews">
        {editing.reviews.map((r, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_80px_3fr_auto] gap-2 mb-2 items-center">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={r.name} onChange={e => setListItem('reviews', i, 'name', e.target.value)} placeholder="Customer name" />
            <input type="number" min="1" max="5" className={inputCls} style={{ borderColor: LIGHT }} value={r.rating} onChange={e => setListItem('reviews', i, 'rating', Number(e.target.value))} />
            <input className={inputCls} style={{ borderColor: LIGHT }} value={r.text} onChange={e => setListItem('reviews', i, 'text', e.target.value)} placeholder="Review text" />
            <button onClick={() => removeListItem('reviews', i)} className="text-red-600 px-2">✕</button>
          </div>
        ))}
        <p className="text-xs mb-2" style={{ color: MID }}>Only add real reviews from real customers.</p>
        <button onClick={() => addListItem('reviews', { name: '', text: '', rating: 5 })} className="text-sm font-semibold" style={{ color: ROSE }}>+ Add review</button>
      </Card>

      <Card title="Questions & answers">
        {editing.faq.map((f, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 mb-2 items-center">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={f.q} onChange={e => setListItem('faq', i, 'q', e.target.value)} placeholder="Question" />
            <input className={inputCls} style={{ borderColor: LIGHT }} value={f.a} onChange={e => setListItem('faq', i, 'a', e.target.value)} placeholder="Answer" />
            <button onClick={() => removeListItem('faq', i)} className="text-red-600 px-2">✕</button>
          </div>
        ))}
        <button onClick={() => addListItem('faq', { q: '', a: '' })} className="text-sm font-semibold" style={{ color: ROSE }}>+ Add question</button>
      </Card>

      <div className="flex justify-end mb-10">
        <button onClick={savePage} disabled={saving} className="px-8 py-3 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: ROSE }}>
          {saving ? 'Saving…' : 'Save Landing Page'}
        </button>
      </div>
    </div>
  );
};

export default LandingPageManager;