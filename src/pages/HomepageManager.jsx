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

  // Hero state — now an array of unlimited slides
  const [heroSlides, setHeroSlides] = useState([]);
  const [autoplaySpeed, setAutoplaySpeed] = useState(5000);
  const [heroUploadingIndex, setHeroUploadingIndex] = useState(null);
  const [heroSaving, setHeroSaving] = useState(false);

  // Free gift product search state
  const [giftProductSearch, setGiftProductSearch] = useState('');
  const [giftSearchResults, setGiftSearchResults] = useState([]);

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

  // ── Hero (carousel) ──────────────────────────────────────────────────────
  const fetchHero = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/hero`);
      if (res.ok) {
        const data = await res.json();
        setHeroSlides(data.slides && data.slides.length > 0
          ? data.slides
          : [{ backgroundImage: '', title: '', subtitle: '', buttonText: 'Shop Now', buttonLink: '/products.html' }]);
        setAutoplaySpeed(data.autoplaySpeed || 5000);
      }
    } catch (e) { console.error(e); }
  };

  const uploadHeroImage = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setHeroUploadingIndex(index);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      setHeroSlides(prev => prev.map((s, i) => i === index ? { ...s, backgroundImage: data.imageUrl } : s));
      showToast('Image uploaded!');
    } catch { showToast('Image upload failed', 'error'); }
    finally { setHeroUploadingIndex(null); }
  };

  const updateSlideField = (index, field, value) => {
    setHeroSlides(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSlide = () => {
    setHeroSlides(prev => [...prev, { backgroundImage: '', title: '', subtitle: '', buttonText: 'Shop Now', buttonLink: '/products.html' }]);
  };

  const removeSlide = (index) => {
    if (heroSlides.length <= 1) { showToast('Keep at least one slide', 'error'); return; }
    setHeroSlides(prev => prev.filter((_, i) => i !== index));
  };

  const moveSlide = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= heroSlides.length) return;
    setHeroSlides(prev => {
      const arr = [...prev];
      [arr[index], arr[j]] = [arr[j], arr[index]];
      return arr;
    });
  };

  const saveHero = async () => {
    setHeroSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/hero`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ slides: heroSlides, autoplaySpeed })
      });
      if (res.ok) showToast('Hero carousel saved!');
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

  // ── Free Gift ─────────────────────────────────────────────────────────────
  const searchGiftProducts = async (query) => {
    setGiftProductSearch(query);
    if (!query || query.length < 2) { setGiftSearchResults([]); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?limit=20&search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setGiftSearchResults(data.results || []);
    } catch (e) { console.error(e); }
  };

  const addGiftProduct = (product) => {
    setSettings(prev => ({
      ...prev,
      freeGift: {
        ...(prev.freeGift || { enabled: false, threshold: 500 }),
        giftProducts: [...(prev.freeGift?.giftProducts || []), product]
      }
    }));
    setGiftProductSearch('');
    setGiftSearchResults([]);
  };

  const removeGiftProduct = (id) => {
    setSettings(prev => ({
      ...prev,
      freeGift: { ...prev.freeGift, giftProducts: (prev.freeGift?.giftProducts || []).filter(g => g._id !== id) }
    }));
  };

  const saveFreeGift = async () => {
    setSettingsSaving(true);
    try {
      const payload = {
        freeGift: {
          enabled: settings.freeGift?.enabled || false,
          threshold: settings.freeGift?.threshold || 500,
          giftProducts: (settings.freeGift?.giftProducts || []).map(g => g._id),
        }
      };
      const res = await fetch(`${API_BASE_URL}/api/site-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) { showToast('Free gift settings saved!'); fetchSettings(); }
      else showToast('Failed to save', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setSettingsSaving(false); }
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

      {/* ── HERO CAROUSEL ── */}
      <Section title="Hero Carousel" icon="🖼️" defaultOpen={true}>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Autoplay Speed (ms per slide)</label>
            <input type="number" value={autoplaySpeed} min={2000} step={500}
              onChange={e => setAutoplaySpeed(parseInt(e.target.value) || 5000)}
              className="w-40 px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div className="space-y-4">
            {heroSlides.map((slide, index) => (
              <div key={index} className="border rounded-xl p-4 bg-gray-50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 text-sm">Slide {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSlide(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">▲</button>
                    <button onClick={() => moveSlide(index, 1)} disabled={index === heroSlides.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">▼</button>
                    <button onClick={() => removeSlide(index)} className="text-red-400 hover:text-red-600 ml-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Background Image</label>
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={e => uploadHeroImage(index, e)} className="hidden" id={`hero-img-upload-${index}`} />
                    <label htmlFor={`hero-img-upload-${index}`} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer text-sm">
                      <Upload className="w-4 h-4" /> {heroUploadingIndex === index ? 'Uploading...' : 'Upload Image'}
                    </label>
                    {slide.backgroundImage && (
                      <button onClick={() => updateSlideField(index, 'backgroundImage', '')} className="text-red-500 text-sm hover:underline">Remove</button>
                    )}
                  </div>
                  {slide.backgroundImage && <img src={slide.backgroundImage} alt="Slide" className="mt-3 w-full max-h-48 object-cover rounded-lg border" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title (optional)</label>
                    <input value={slide.title || ''} onChange={e => updateSlideField(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Illuminate Your Space" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle (optional)</label>
                    <input value={slide.subtitle || ''} onChange={e => updateSlideField(index, 'subtitle', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Handcrafted with love" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Button Text</label>
                    <input value={slide.buttonText || ''} onChange={e => updateSlideField(index, 'buttonText', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Button Link</label>
                    <input value={slide.buttonLink || ''} onChange={e => updateSlideField(index, 'buttonLink', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="/products.html" />
                  </div>
                </div>

                {/* Live preview */}
                <div className="relative h-40 rounded-lg overflow-hidden bg-gray-200"
                  style={slide.backgroundImage ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center gap-2">
                    {slide.title && <p className="text-white font-bold text-lg text-center px-2">{slide.title}</p>}
                    {slide.subtitle && <p className="text-white text-sm text-center px-2">{slide.subtitle}</p>}
                    <span className="px-4 py-1 bg-white text-gray-800 rounded text-sm font-semibold">{slide.buttonText || 'Shop Now'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addSlide} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Slide
          </button>

          <button onClick={saveHero} disabled={heroSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
            {heroSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {heroSaving ? 'Saving...' : 'Save Carousel'}
          </button>
        </div>
      </Section>

      {/* ── FREE GIFT THRESHOLD ── */}
      <Section title="Free Gift Threshold" icon="🎁">
        {settings && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.freeGift?.enabled || false}
                onChange={e => setSettings(p => ({ ...p, freeGift: { ...p.freeGift, enabled: e.target.checked } }))}
                className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700">Enable free gift progress bar</span>
            </label>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Spend Threshold (EGP)</label>
              <input type="number" min={0} value={settings.freeGift?.threshold ?? 500}
                onChange={e => setSettings(p => ({ ...p, freeGift: { ...p.freeGift, threshold: parseFloat(e.target.value) || 0 } }))}
                className="w-40 px-3 py-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gift Product(s) <span className="font-normal text-gray-400">— 1 product auto-adds to cart; 2+ lets the customer choose</span>
              </label>
              <div className="space-y-2 mb-3">
                {(settings.freeGift?.giftProducts || []).map(g => (
                  <div key={g._id} className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                    <img src={g.imagePaths?.[0]} alt="" className="w-8 h-8 object-cover rounded" />
                    <span className="flex-1 text-sm text-gray-700">{g.name_en}</span>
                    <button onClick={() => removeGiftProduct(g._id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {(!settings.freeGift?.giftProducts || settings.freeGift.giftProducts.length === 0) && (
                  <p className="text-gray-400 text-sm italic">No gift products yet. Search and add below.</p>
                )}
              </div>
              <div className="relative">
                <input value={giftProductSearch} onChange={e => searchGiftProducts(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Search products to add as a gift..." />
                {giftSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {giftSearchResults.map(p => (
                      <button key={p._id} onClick={() => addGiftProduct(p)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-left">
                        <img src={p.imagePaths?.[0]} alt="" className="w-8 h-8 object-cover rounded" />
                        <span className="text-sm text-gray-700">{p.name_en || p.bundleName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button onClick={saveFreeGift} disabled={settingsSaving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
              {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {settingsSaving ? 'Saving...' : 'Save Free Gift'}
            </button>
          </div>
        )}
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
                { key: 'stores',     label: 'Our Stores',  href: 'Stores.html', badge: 'New' },
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