import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const DARK = '#1E1023';
const ROSE = '#BE185D';
const MID = '#6B4A6E';
const LIGHT = '#D8B4D8';
const PALE = '#FFF0F6';

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

const Field = ({ label, hint, children }) => (
  <div className="mb-4">
    <label className={labelCls} style={{ color: MID }}>{label}</label>
    {children}
    {hint && <p className="text-xs mt-1" style={{ color: MID }}>{hint}</p>}
  </div>
);

const Card = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border p-6 mb-6" style={{ borderColor: LIGHT }}>
    <h3 className="text-lg font-bold" style={{ color: DARK }}>{title}</h3>
    {subtitle && <p className="text-sm mb-4" style={{ color: MID }}>{subtitle}</p>}
    {!subtitle && <div className="mb-4" />}
    {children}
  </div>
);

const emptyStore = {
  payment: {
    depositEnabled: true, instapayNumber: '', instapayAccountName: '',
    depositType: 'percent', depositValue: 50,
    policyHeading: 'How payment works', policyText: '',
    acknowledgeLabel: 'I have read and agree to the payment and shipping terms',
    successMessage: ''
  },
  metaPixelId: '', googleAnalyticsId: '', metaTestEventCode: '', metaApiVersion: 'v23.0',
  metaCapiTokenSet: false, metaCapiTokenMasked: ''
};

const StoreSettingsManager = () => {
  const token = localStorage.getItem('adminToken');
  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const [store, setStore] = useState(emptyStore);
  const [newCapiToken, setNewCapiToken] = useState('');
  const [clearToken, setClearToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pages, setPages] = useState([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [pageDraft, setPageDraft] = useState(null);
  const [pageSaving, setPageSaving] = useState(false);

  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  const loadStore = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/site-settings/store`, { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStore({ ...emptyStore, ...data, payment: { ...emptyStore.payment, ...(data.payment || {}) } });
    } catch { showToast('Could not load store settings', 'error'); }
    finally { setLoading(false); }
  };

  const loadPages = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages`, { headers: authHeaders });
      if (!res.ok) throw new Error();
      const list = await res.json();
      setPages(list);
      if (list.length && !activeSlug) { setActiveSlug(list[0].slug); setPageDraft(list[0]); }
    } catch { showToast('Could not load policy pages', 'error'); }
  };

  useEffect(() => { loadStore(); loadPages(); }, []); // eslint-disable-line

  const setPay = (k, v) => setStore(prev => ({ ...prev, payment: { ...prev.payment, [k]: v } }));
  const setTop = (k, v) => setStore(prev => ({ ...prev, [k]: v }));

  const saveStore = async () => {
    setSaving(true);
    try {
      const body = {
        payment: store.payment,
        metaPixelId: store.metaPixelId,
        googleAnalyticsId: store.googleAnalyticsId,
        metaTestEventCode: store.metaTestEventCode,
        metaApiVersion: store.metaApiVersion,
      };
      if (clearToken) body.clearMetaCapiToken = true;
      else if (newCapiToken.trim()) body.metaCapiToken = newCapiToken.trim();

      const res = await fetch(`${API_BASE_URL}/api/site-settings/store`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.message || 'Save failed', 'error'); return; }
      setNewCapiToken(''); setClearToken(false);
      await loadStore();
      showToast('Store settings saved!');
    } catch { showToast('Network error', 'error'); }
    finally { setSaving(false); }
  };

  const pickPage = (slug) => {
    const p = pages.find(x => x.slug === slug);
    setActiveSlug(slug); setPageDraft(p ? { ...p } : null);
  };

  const savePage = async () => {
    if (!pageDraft) return;
    setPageSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pages/${pageDraft.slug}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ title: pageDraft.title, summary: pageDraft.summary, body: pageDraft.body, isPublished: pageDraft.isPublished })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.message || 'Save failed', 'error'); return; }
      setPages(prev => prev.map(p => p.slug === data.slug ? data : p));
      setPageDraft(data);
      showToast('Page saved!');
    } catch { showToast('Network error', 'error'); }
    finally { setPageSaving(false); }
  };

  if (loading) return <p style={{ color: MID }}>Loading…</p>;

  const pay = store.payment;
  const exampleTotal = 1000;
  const exampleDeposit = pay.depositType === 'fixed' ? Math.min(exampleTotal, Number(pay.depositValue) || 0) : Math.ceil((exampleTotal * (Number(pay.depositValue) || 0)) / 100);

  return (
    <div>
      <Toast {...toast} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: DARK }}>Store Settings</h2>
          <p className="text-sm" style={{ color: MID }}>Payment, tracking and policy pages. Nothing here is hardcoded in the website.</p>
        </div>
        <button onClick={saveStore} disabled={saving} className="px-6 py-2 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: ROSE }}>
          {saving ? 'Saving…' : 'Save payment & tracking'}
        </button>
      </div>

      <Card title="Payment: deposit, then balance" subtitle="Shown to customers on the checkout page, above the Place Order button.">
        <label className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: DARK }}>
          <input type="checkbox" checked={pay.depositEnabled} onChange={e => setPay('depositEnabled', e.target.checked)} />
          Show the deposit section at checkout
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="InstaPay number">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={pay.instapayNumber} onChange={e => setPay('instapayNumber', e.target.value)} placeholder="The number customers send the deposit to" />
          </Field>
          <Field label="Account name">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={pay.instapayAccountName} onChange={e => setPay('instapayAccountName', e.target.value)} placeholder="Name shown on the account" />
          </Field>
          <Field label="Deposit type">
            <select className={inputCls} style={{ borderColor: LIGHT }} value={pay.depositType} onChange={e => setPay('depositType', e.target.value)}>
              <option value="percent">Percentage of the order total</option>
              <option value="fixed">Fixed amount (EGP)</option>
            </select>
          </Field>
          <Field label={pay.depositType === 'percent' ? 'Deposit (%)' : 'Deposit (EGP)'}
                 hint={`Example: on a ${exampleTotal} EGP order the deposit would be ${exampleDeposit} EGP.`}>
            <input type="number" min="0" className={inputCls} style={{ borderColor: LIGHT }} value={pay.depositValue} onChange={e => setPay('depositValue', e.target.value)} />
          </Field>
        </div>

        <Field label="Heading above the policy">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={pay.policyHeading} onChange={e => setPay('policyHeading', e.target.value)} />
        </Field>
        <Field label="Policy message shown before “Place Order”"
               hint="Blank line = new paragraph. You can use {{depositAmount}}, {{balanceAmount}}, {{total}}, {{instapayNumber}} and {{instapayName}}; they are replaced with the customer's real figures.">
          <textarea rows={8} className={inputCls} style={{ borderColor: LIGHT }} value={pay.policyText} onChange={e => setPay('policyText', e.target.value)} />
        </Field>
        <Field label="Checkbox wording (the customer must tick it to order)">
          <input className={inputCls} style={{ borderColor: LIGHT }} value={pay.acknowledgeLabel} onChange={e => setPay('acknowledgeLabel', e.target.value)} />
        </Field>
        <Field label="Message on the “order received” screen"
               hint="Optional. Same {{tokens}} as above. If empty, a short default message is shown under the deposit amount.">
          <textarea rows={4} className={inputCls} style={{ borderColor: LIGHT }} value={pay.successMessage} onChange={e => setPay('successMessage', e.target.value)} />
        </Field>
      </Card>

      <Card title="Meta (Facebook) Pixel & Conversions API" subtitle="Lets Meta see visits and purchases from your ads, from the browser and from your server.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Meta Pixel ID" hint="Digits only, about 15–16 of them. Events Manager → your Pixel → the number under its name.">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={store.metaPixelId} onChange={e => setTop('metaPixelId', e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Google Analytics ID (optional)" hint="Looks like G-XXXXXXXXXX.">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={store.googleAnalyticsId} onChange={e => setTop('googleAnalyticsId', e.target.value)} />
          </Field>
        </div>

        <Field label="Conversions API access token"
               hint={store.metaCapiTokenSet
                 ? `A token is saved (ends in …${store.metaCapiTokenMasked.slice(-4)}). Leave this empty to keep it, or paste a new one to replace it. It is never shown again or sent to the website.`
                 : 'Not set yet. Paste the token generated in Events Manager → Settings → Conversions API.'}>
          <input type="password" autoComplete="off" className={inputCls} style={{ borderColor: LIGHT }} value={newCapiToken} onChange={e => { setNewCapiToken(e.target.value); setClearToken(false); }} placeholder={store.metaCapiTokenSet ? '•••••••• (saved)' : 'Paste token'} />
          {store.metaCapiTokenSet && (
            <label className="flex items-center gap-2 text-xs mt-2" style={{ color: MID }}>
              <input type="checkbox" checked={clearToken} onChange={e => { setClearToken(e.target.checked); if (e.target.checked) setNewCapiToken(''); }} />
              Remove the saved token
            </label>
          )}
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Test event code (only while testing)" hint="From Events Manager → Test events. While filled, server events show up in the Test events tab and do not count as real. Empty it when you go live.">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={store.metaTestEventCode} onChange={e => setTop('metaTestEventCode', e.target.value)} placeholder="TEST12345" />
          </Field>
          <Field label="Graph API version" hint="Change only if Meta retires this version (for example v24.0).">
            <input className={inputCls} style={{ borderColor: LIGHT }} value={store.metaApiVersion} onChange={e => setTop('metaApiVersion', e.target.value)} />
          </Field>
        </div>
        <div className="text-sm rounded-lg p-3" style={{ background: PALE, color: MID }}>
          Status: Pixel {store.metaPixelId ? '✔ set' : '✘ missing'} · Conversions API token {store.metaCapiTokenSet ? '✔ saved' : '✘ missing'} · Mode {store.metaTestEventCode ? 'TEST' : 'LIVE'}
        </div>
      </Card>

      <Card title="Policy pages" subtitle="FAQ, Shipping, Returns, Terms and Privacy. Customers reach them from the footer links.">
        <div className="flex flex-wrap gap-2 mb-4">
          {pages.map(p => (
            <button key={p.slug} onClick={() => pickPage(p.slug)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold border"
              style={activeSlug === p.slug ? { background: ROSE, color: '#fff', borderColor: ROSE } : { background: '#fff', color: MID, borderColor: LIGHT }}>
              {p.title}
            </button>
          ))}
        </div>
        {pageDraft && (
          <div>
            <Field label="Title">
              <input className={inputCls} style={{ borderColor: LIGHT }} value={pageDraft.title} onChange={e => setPageDraft({ ...pageDraft, title: e.target.value })} />
            </Field>
            <Field label="Short summary (under the title)">
              <input className={inputCls} style={{ borderColor: LIGHT }} value={pageDraft.summary || ''} onChange={e => setPageDraft({ ...pageDraft, summary: e.target.value })} />
            </Field>
            <Field label="Page text" hint="Blank line = new paragraph. Review the starter text and change anything that does not match how you work.">
              <textarea rows={16} className={inputCls} style={{ borderColor: LIGHT }} value={pageDraft.body || ''} onChange={e => setPageDraft({ ...pageDraft, body: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: DARK }}>
                <input type="checkbox" checked={pageDraft.isPublished !== false} onChange={e => setPageDraft({ ...pageDraft, isPublished: e.target.checked })} />
                Published
              </label>
              <div className="flex items-center gap-3">
                <a href={`https://sirajcare.com/page.html?slug=${pageDraft.slug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold" style={{ color: ROSE }}>View page ↗</a>
                <button onClick={savePage} disabled={pageSaving} className="px-5 py-2 rounded-lg text-white font-semibold disabled:opacity-60" style={{ background: ROSE }}>
                  {pageSaving ? 'Saving…' : 'Save this page'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StoreSettingsManager;