import React, { useState, useEffect } from 'react';
import { Save, Upload, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp, MapPin, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

// ── Collapsible Section Wrapper ───────────────────────────────────────────────
const Section = ({ title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-indigo-600">{icon}</span>
          <span className="font-semibold text-gray-800 text-lg">{title}</span>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t pt-4">{children}</div>}
    </div>
  );
};

// ── Toast message ─────────────────────────────────────────────────────────────
const Toast = ({ message, type }) => {
  if (!message) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {message}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const HomepageManager = () => {
  const token = localStorage.getItem('adminToken');

  // Hero state
  const [hero, setHero] = useState({
    backgroundImage: '', buttonText: 'Shop Now',
    buttonLink: '/products.html', title: '', subtitle: ''
  });
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroSaving, setHeroSaving] = useState(false);

  // Site settings state (ribbon + nav + footer)
  const [settings, setSettings] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [newRibbonMsg, setNewRibbonMsg] = useState('');

  // Stores state
  const [stores, setStores] = useState([]);
  const [storesSaving, setStoresSaving] = useState(false);
  const [editingStore, setEditingStore] = useState(null); // null = add new
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '', address: '', phone: '', hours: '', mapsEmbedUrl: '', status: 'active', sortOrder: 0
  });
  const [mapPreview, setMapPreview] = useState(false);

  // Toast
  const [toast, setToast] = useState({ message: '', type: '' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  useEffect(() => {
    fetchHero();
    fetchSettings();
    fetchStores();
  }, []);

  // ── Hero ──────────────────────────────────────────────────────────────────
  const fetchHero = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/hero`);
      if (res.ok) setHero(await res.json());
    } catch (e) { console.error(e); }
  };

  const uploadHeroImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setHeroUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      setHero(prev => ({ ...prev, backgroundImage: data.imageUrl }));
      showToast('Image uploaded!');
    } catch { showToast('Image upload failed', 'error'); }
    finally { setHeroUploading(false); }
  };

  const saveHero = async () => {
    setHeroSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/hero`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(hero)
      });
      if (res.ok) showToast('Hero section saved!');
      else showToast('Failed to save hero', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setHeroSaving(false); }
  };

  // ── Site Settings (ribbon + nav + footer) ─────────────────────────────────
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/site-settings`);
      if (res.ok) setSettings(await res.json());
    } catch (e) { console.error(e); }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/site-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      if (res.ok) showToast('Settings saved!');
      else showToast('Failed to save settings', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setSettingsSaving(false); }
  };

  const addRibbonMessage = () => {
    if (!newRibbonMsg.trim()) return;
    setSettings(prev => ({ ...prev, ribbonMessages: [...(prev.ribbonMessages || []), newRibbonMsg.trim()] }));
    setNewRibbonMsg('');
  };

  const removeRibbonMessage = (i) => {
    setSettings(prev => ({ ...prev, ribbonMessages: prev.ribbonMessages.filter((_, idx) => idx !== i) }));
  };

  const moveRibbonMessage = (i, dir) => {
    const msgs = [...(settings.ribbonMessages || [])];
    const j = i + dir;
    if (j < 0 || j >= msgs.length) return;
    [msgs[i], msgs[j]] = [msgs[j], msgs[i]];
    setSettings(prev => ({ ...prev, ribbonMessages: msgs }));
  };

  // ── Stores ────────────────────────────────────────────────────────────────
  const fetchStores = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stores?admin=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStores(await res.json());
    } catch (e) { console.error(e); }
  };

  const openAddStore = () => {
    setEditingStore(null);
    setStoreForm({ name: '', address: '', phone: '', hours: '', mapsEmbedUrl: '', status: 'active', sortOrder: stores.length });
    setMapPreview(false);
    setShowStoreForm(true);
  };

  const openEditStore = (store) => {
    setEditingStore(store._id);
    setStoreForm({ name: store.name, address: store.address, phone: store.phone, hours: store.hours, mapsEmbedUrl: store.mapsEmbedUrl, status: store.status, sortOrder: store.sortOrder });
    setMapPreview(false);
    setShowStoreForm(true);
  };

  const saveStore = async () => {
    if (!storeForm.name || !storeForm.address) { showToast('Name and address are required', 'error'); return; }
    setStoresSaving(true);
    try {
      const url = editingStore ? `${API_BASE_URL}/api/stores/${editingStore}` : `${API_BASE_URL}/api/stores`;
      const method = editingStore ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(storeForm)
      });
      if (res.ok) {
        showToast(editingStore ? 'Store updated!' : 'Store added!');
        setShowStoreForm(false);
        fetchStores();
      } else { showToast('Failed to save store', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setStoresSaving(false); }
  };

  const deleteStore = async (id) => {
    if (!window.confirm('Delete this store?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/stores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      showToast('Store deleted');
      fetchStores();
    } catch { showToast('Delete failed', 'error'); }
  };

  const toggleStoreStatus = async (store) => {
    const newStatus = store.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`${API_BASE_URL}/api/stores/${store._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...store, status: newStatus })
      });
      fetchStores();
    } catch { showToast('Failed to update status', 'error'); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      <Toast message={toast.message} type={toast.type} />

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Homepage Manager</h1>

      {/* ── HERO SECTION ── */}
      <Section title="Hero Banner" icon="🖼️" defaultOpen={true}>
        <div className="space-y-5">
          {/* Image upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Background Image</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={uploadHeroImage} className="hidden" id="hero-img-upload" />
              <label htmlFor="hero-img-upload" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer text-sm">
                <Upload className="w-4 h-4" /> {heroUploading ? 'Uploading...' : 'Upload Image'}
              </label>
              {hero.backgroundImage && (
                <button onClick={() => setHero(p => ({ ...p, backgroundImage: '' }))} className="text-red-500 text-sm hover:underline">Remove</button>
              )}
            </div>
            {hero.backgroundImage && <img src={hero.backgroundImage} alt="Hero" className="mt-3 w-full max-h-48 object-cover rounded-lg border" />}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title (optional)</label>
              <input value={hero.title || ''} onChange={e => setHero(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Illuminate Your Space" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle (optional)</label>
              <input value={hero.subtitle || ''} onChange={e => setHero(p => ({ ...p, subtitle: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Handcrafted with love" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Button Text</label>
              <input value={hero.buttonText || ''} onChange={e => setHero(p => ({ ...p, buttonText: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Button Link</label>
              <input value={hero.buttonLink || ''} onChange={e => setHero(p => ({ ...p, buttonLink: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="/products.html" />
            </div>
          </div>
          {/* Live preview */}
          <div className="relative h-48 rounded-lg overflow-hidden bg-gray-200"
            style={hero.backgroundImage ? { backgroundImage: `url(${hero.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
            <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center gap-2">
              {hero.title && <p className="text-white font-bold text-xl text-center">{hero.title}</p>}
              {hero.subtitle && <p className="text-white text-sm text-center">{hero.subtitle}</p>}
              <span className="px-4 py-1 bg-white text-gray-800 rounded text-sm font-semibold">{hero.buttonText || 'Shop Now'}</span>
            </div>
          </div>
          <button onClick={saveHero} disabled={heroSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
            {heroSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {heroSaving ? 'Saving...' : 'Save Hero'}
          </button>
        </div>
      </Section>

      {/* ── ANNOUNCEMENT RIBBON ── */}
      <Section title="Announcement Ribbon" icon="📢">
        {settings && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.ribbonEnabled}
                  onChange={e => setSettings(p => ({ ...p, ribbonEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-gray-700">Ribbon visible on site</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Rotation Speed (ms per message)</label>
              <input type="number" value={settings.ribbonSpeed || 4000} min={1000} step={500}
                onChange={e => setSettings(p => ({ ...p, ribbonSpeed: parseInt(e.target.value) }))}
                className="w-40 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Messages (rotating)</label>
              <div className="space-y-2 mb-3">
                {(settings.ribbonMessages || []).map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="flex-1 text-sm text-gray-700">{msg}</span>
                    <button onClick={() => moveRibbonMessage(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">▲</button>
                    <button onClick={() => moveRibbonMessage(i, 1)} disabled={i === (settings.ribbonMessages.length - 1)} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">▼</button>
                    <button onClick={() => removeRibbonMessage(i)} className="text-red-400 hover:text-red-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {(!settings.ribbonMessages || settings.ribbonMessages.length === 0) && (
                  <p className="text-gray-400 text-sm italic">No messages yet. Add one below.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input value={newRibbonMsg} onChange={e => setNewRibbonMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRibbonMessage()}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="🎉 Free delivery on orders over 2000 EGP" />
                <button onClick={addRibbonMessage} className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
            <button onClick={saveSettings} disabled={settingsSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
              {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {settingsSaving ? 'Saving...' : 'Save Ribbon'}
            </button>
          </div>
        )}
      </Section>

      {/* ── NAV LINKS ── */}
      <Section title="Navigation Links" icon="🔗">
        {settings && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Toggle which links appear in the navigation bar and mobile menu.</p>
            <div className="space-y-2">
              {[
                { key: 'home',       label: 'Home',        href: 'index.html' },
                { key: 'products',   label: 'Products',    href: 'products.html' },
                { key: 'bundles',    label: 'Bundles',     href: 'bundles.html' },
                { key: 'trackOrder', label: 'Track Order', href: 'order-tracking.html' },
                { key: 'stores',     label: 'Our Stores',  href: 'stores.html', badge: 'New' },
              ].map(link => (
                <div key={link.key} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{link.label}</span>
                    <span className="text-xs text-gray-400">→ {link.href}</span>
                    {link.badge && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">{link.badge}</span>}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={settings.navLinks?.[link.key] ?? true}
                      onChange={e => setSettings(p => ({ ...p, navLinks: { ...p.navLinks, [link.key]: e.target.checked } }))}
                      className="w-4 h-4 rounded" />
                    <span className="text-xs text-gray-500">{settings.navLinks?.[link.key] ? 'Visible' : 'Hidden'}</span>
                  </label>
                </div>
              ))}
            </div>
            <button onClick={saveSettings} disabled={settingsSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
              {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {settingsSaving ? 'Saving...' : 'Save Nav'}
            </button>
          </div>
        )}
      </Section>

      {/* ── FOOTER ── */}
      <Section title="Footer" icon="📄">
        {settings && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Email</label>
                <input value={settings.footerEmail || ''} onChange={e => setSettings(p => ({ ...p, footerEmail: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tagline</label>
                <input value={settings.footerTagline || ''} onChange={e => setSettings(p => ({ ...p, footerTagline: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Copyright Text</label>
                <input value={settings.footerCopyright || ''} onChange={e => setSettings(p => ({ ...p, footerCopyright: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Social Links</label>
              <div className="space-y-2">
                {[
                  { key: 'footerInstagram', label: '📸 Instagram URL' },
                  { key: 'footerFacebook',  label: '👤 Facebook URL' },
                  { key: 'footerTiktok',    label: '🎵 TikTok URL' },
                ].map(s => (
                  <div key={s.key}>
                    <label className="block text-xs text-gray-500 mb-1">{s.label}</label>
                    <input value={settings[s.key] || ''} onChange={e => setSettings(p => ({ ...p, [s.key]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveSettings} disabled={settingsSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
              {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {settingsSaving ? 'Saving...' : 'Save Footer'}
            </button>
          </div>
        )}
      </Section>

      {/* ── WHATSAPP ORDER CONFIRMATION ── */}
      <Section title="WhatsApp Order Message" icon="📱">
        {settings ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              This message is sent to the customer after they place an order.
              Use <code className="bg-pink-50 text-pink-700 px-1 rounded">{'{{name}}'}</code>,{' '}
              <code className="bg-pink-50 text-pink-700 px-1 rounded">{'{{orderId}}'}</code>,{' '}
              <code className="bg-pink-50 text-pink-700 px-1 rounded">{'{{total}}'}</code>,{' '}
              <code className="bg-pink-50 text-pink-700 px-1 rounded">{'{{items}}'}</code> as placeholders.
            </p>

            {/* WhatsApp phone number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your WhatsApp Number (with country code)
              </label>
              <input
                type="text"
                value={settings.whatsappPhone || ''}
                onChange={e => setSettings(prev => ({ ...prev, whatsappPhone: e.target.value }))}
                placeholder="+201001775793"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400"
              />
              <p className="text-xs text-gray-400 mt-1">This is YOUR number — customers will message you here.</p>
            </div>

            {/* Message template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Template
              </label>
              <textarea
                value={settings.whatsappOrderTemplate || ''}
                onChange={e => setSettings(prev => ({ ...prev, whatsappOrderTemplate: e.target.value }))}
                rows={14}
                dir="auto"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400 font-mono leading-relaxed"
                placeholder="Type your WhatsApp message here..."
              />
              <p className="text-xs text-gray-400 mt-1">
                {(settings.whatsappOrderTemplate || '').length} characters
              </p>
            </div>

            {/* Live preview */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-green-700 mb-2">📱 Preview (with sample data):</p>
              <pre className="text-xs text-green-900 whitespace-pre-wrap font-sans leading-relaxed">
                {(settings.whatsappOrderTemplate || '')
                  .replace(/\{\{name\}\}/g, 'سارة')
                  .replace(/\{\{orderId\}\}/g, '#A1B2C3D4')
                  .replace(/\{\{total\}\}/g, '450')
                  .replace(/\{\{items\}\}/g, '• شمعة Mason Jar (Rose Vanilla) × 1\n• Reed Diffuser (Oud) × 1')
                  .replace(/\{\{city\}\}/g, 'Cairo')}
              </pre>
            </div>

            <button
              onClick={saveSettings}
              disabled={settingsSaving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {settingsSaving ? 'Saving...' : '💾 Save WhatsApp Settings'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Loading settings...</p>
        )}
      </Section>

      {/* ── STORE LOCATIONS ── */}
      <Section title="Store Locations" icon="📍">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Manage your physical store locations. Only active stores appear on the website.</p>
            <button onClick={openAddStore} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
              <Plus className="w-4 h-4" /> Add Store
            </button>
          </div>

          {/* Store list */}
          <div className="space-y-3">
            {stores.length === 0 && <p className="text-gray-400 text-sm italic text-center py-4">No stores yet. Add your first location.</p>}
            {stores.map(store => (
              <div key={store._id} className={`border rounded-lg p-4 ${store.status === 'active' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{store.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${store.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {store.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{store.address}</p>
                    {store.phone && <p className="text-sm text-gray-500">📞 {store.phone}</p>}
                    {store.hours && <p className="text-sm text-gray-500">🕐 {store.hours}</p>}
                    {store.mapsEmbedUrl && <p className="text-xs text-indigo-500 mt-1">✓ Google Map linked</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleStoreStatus(store)} title={store.status === 'active' ? 'Hide store' : 'Activate store'}
                      className={`p-2 rounded-lg ${store.status === 'active' ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}>
                      {store.status === 'active' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditStore(store)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      ✏️
                    </button>
                    <button onClick={() => deleteStore(store._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit store form */}
          {showStoreForm && (
            <div className="border-2 border-indigo-100 rounded-xl p-5 bg-indigo-50 space-y-4">
              <h3 className="font-semibold text-gray-800">{editingStore ? 'Edit Store' : 'Add New Store'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Store Name *</label>
                  <input value={storeForm.name} onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Siraj Candles – Maadi" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                  <input value={storeForm.phone} onChange={e => setStoreForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="+20 1XX XXX XXXX" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Address *</label>
                  <input value={storeForm.address} onChange={e => setStoreForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="123 Street Name, District, City" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Opening Hours</label>
                  <input value={storeForm.hours} onChange={e => setStoreForm(p => ({ ...p, hours: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Sat–Thu 10am–9pm, Fri 2pm–9pm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={storeForm.status} onChange={e => setStoreForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="active">Active (visible on site)</option>
                    <option value="inactive">Inactive (hidden)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Google Maps Embed URL
                    <span className="font-normal text-gray-400 ml-2">— Go to Google Maps → Share → Embed a map → copy the src="..." URL</span>
                  </label>
                  <div className="flex gap-2">
                    <input value={storeForm.mapsEmbedUrl} onChange={e => setStoreForm(p => ({ ...p, mapsEmbedUrl: e.target.value }))}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="https://www.google.com/maps/embed?pb=..." />
                    {storeForm.mapsEmbedUrl && (
                      <button onClick={() => setMapPreview(!mapPreview)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
                        {mapPreview ? 'Hide' : 'Preview'}
                      </button>
                    )}
                  </div>
                  {mapPreview && storeForm.mapsEmbedUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden border">
                      <iframe src={storeForm.mapsEmbedUrl} width="100%" height="250" style={{ border: 0 }} allowFullScreen loading="lazy" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveStore} disabled={storesSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
                  {storesSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {storesSaving ? 'Saving...' : editingStore ? 'Update Store' : 'Add Store'}
                </button>
                <button onClick={() => setShowStoreForm(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
};

export default HomepageManager;