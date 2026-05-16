import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon, Video, Music, Image as ImageIcon,
  Instagram, Store, Plus, ChevronLeft, ChevronRight, X,
  Copy, Trash2, ChevronDown, ChevronUp, Camera, Star,
  Loader2, Check, AlertCircle, BarChart2, Upload, Smile
} from 'lucide-react';

// ─────────────────────────────────────────────
// RESPONSIVE HOOK
// ─────────────────────────────────────────────
const useWindowWidth = () => {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
};

// ─────────────────────────────────────────────
// DESIGN TOKENS — match your existing dashboard
// ─────────────────────────────────────────────
const DARK  = '#1E1023';
const PINK  = '#F472B6';
const ROSE  = '#BE185D';
const PALE  = '#FFF0F6';
const MID   = '#6B4A6E';
const CREAM = '#FCE7F3';
const LIGHT = '#D8B4D8';

const API = 'https://siraj-backend.onrender.com';

// ─────────────────────────────────────────────
// POST TYPES
// ─────────────────────────────────────────────
const POST_TYPES = {
  vo:       { label: 'Voiceover',   icon: Video,      color: ROSE,      bg: PALE },
  music:    { label: 'Music Reel',  icon: Music,      color: '#0369a1', bg: '#e0f2fe' },
  carousel: { label: 'Carousel',    icon: ImageIcon,  color: '#854d0e', bg: '#fef9c3' },
  photo:    { label: 'Photo',       icon: Camera,     color: '#15803d', bg: '#dcfce7' },
  story:    { label: 'Story',       icon: Instagram,  color: MID,       bg: CREAM },
  bazaar:   { label: 'Bazaar',      icon: Store,      color: '#991b1b', bg: '#fee2e2' },
};

// ─────────────────────────────────────────────
// PASTEL STICKERS
// Each has a key, emoji, label, pastel bg + text
// ─────────────────────────────────────────────
const PASTEL_STICKERS = {
  launch:   { emoji: '🚀', label: 'Launch',    bg: '#fde8ff', color: '#7e22ce' },
  sale:     { emoji: '🏷️', label: 'Sale',      bg: '#fff0e0', color: '#c2410c' },
  shoot:    { emoji: '📸', label: 'Shoot',     bg: '#e0f2fe', color: '#0369a1' },
  event:    { emoji: '🎪', label: 'Event',     bg: '#fef9c3', color: '#854d0e' },
  collab:   { emoji: '🤝', label: 'Collab',    bg: '#dcfce7', color: '#15803d' },
  deadline: { emoji: '⏰', label: 'Deadline',  bg: '#fee2e2', color: '#991b1b' },
  idea:     { emoji: '💡', label: 'Idea',      bg: '#fef3c7', color: '#92400e' },
  rest:     { emoji: '🌸', label: 'Rest Day',  bg: '#fce7f3', color: '#9d174d' },
  reminder: { emoji: '📌', label: 'Reminder',  bg: '#ede9fe', color: '#5b21b6' },
  bazaar:   { emoji: '🕌', label: 'Bazaar',    bg: '#ecfeff', color: '#0e7490' },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const makeId = () => 'p' + Date.now() + Math.random().toString(36).slice(2, 6);
const pad    = n  => String(n).padStart(2, '0');

const toDateStr = (year, month, day) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

const parseDateStr = (str) => {
  // Parse YYYY-MM-DD without timezone shift
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay    = (y, m) => new Date(y, m, 1).getDay();

// ─────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────
const getToken = () => localStorage.getItem('sirajAdminToken');

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const uploadToCloudinary = async (file) => {
  const token = getToken();
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.imageUrl) throw new Error('Upload failed');
  return data.imageUrl;
};

// ═════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════
export default function ContentPlanner() {
  // All plans keyed by date string
  const [plans,         setPlans]         = useState({});
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState({ msg: '', type: 'ok' });
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [currentMonth,  setCurrentMonth]  = useState({
    year: new Date().getFullYear(), month: new Date().getMonth()
  });
  const [activeFilters,  setActiveFilters]  = useState(new Set(Object.keys(POST_TYPES)));
  const [expandedPosts,  setExpandedPosts]  = useState(new Set());
  const [expandedMetrics,setExpandedMetrics]= useState(new Set());
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [addDayModal,   setAddDayModal]   = useState(false);
  const [newDayDate,    setNewDayDate]    = useState('');
  const [uploadingPost, setUploadingPost] = useState(null); // postId being uploaded

  const saveTimerRef  = useRef(null);
  const windowWidth   = useWindowWidth();
  const isMobile      = windowWidth < 768;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Toast ──────────────────────────────────
  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 3000);
  }, []);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || '');
    showToast(`Copied ${label}!`);
  };

  // ── Load all plans on mount ────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/api/content/all');
        const map = {};
        data.plans.forEach(p => { map[p.date] = p; });
        setPlans(map);
      } catch (err) {
        showToast('Could not load plans: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Debounced save whenever a day's plan changes ──
  const saveDay = useCallback(async (dateStr, dayData) => {
    if (!dateStr) return;
    setSaving(true);
    try {
      const updated = await apiFetch('/api/content', {
        method: 'POST',
        body: JSON.stringify({ date: dateStr, ...dayData }),
      });
      setPlans(prev => ({ ...prev, [dateStr]: updated.plan }));
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  // Debounce: wait 800ms after last change before hitting the API
  const scheduleSave = useCallback((dateStr, dayData) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDay(dateStr, dayData), 800);
  }, [saveDay]);

  // ── Update a field on the selected day ────
  const updateDay = (field, value) => {
    const current = plans[selectedDate] || emptyDay(selectedDate);
    const updated  = { ...current, [field]: value };
    setPlans(prev => ({ ...prev, [selectedDate]: updated }));
    scheduleSave(selectedDate, updated);
  };

  const emptyDay = (date) => ({
    date, theme: '', notes: '', isImportant: false, stickers: [], posts: []
  });

  // ── Month navigation ───────────────────────
  const changeMonth = (dir) => {
    setCurrentMonth(prev => {
      let m = prev.month + dir, y = prev.year;
      if (m > 11) { m = 0; y++; }
      if (m <  0) { m = 11; y--; }
      return { year: y, month: m };
    });
  };

  // ── Add day modal ──────────────────────────
  const handleConfirmAddDay = () => {
    if (!newDayDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDayDate)) {
      showToast('Please pick a valid date.', 'error');
      return;
    }
    if (!plans[newDayDate]) {
      const fresh = emptyDay(newDayDate);
      setPlans(prev => ({ ...prev, [newDayDate]: fresh }));
      saveDay(newDayDate, fresh);
    }
    setSelectedDate(newDayDate);
    setAddDayModal(false);
    setNewDayDate('');
  };

  // ── Click a calendar cell ──────────────────
  const handleDayClick = (dateStr) => {
    if (!plans[dateStr]) {
      const fresh = emptyDay(dateStr);
      setPlans(prev => ({ ...prev, [dateStr]: fresh }));
      saveDay(dateStr, fresh);
    }
    setSelectedDate(dateStr);
  };

  // ── Delete a day ───────────────────────────
  const handleDeleteDay = async (dateStr) => {
    if (!window.confirm(`Delete the entire plan for ${dateStr}?`)) return;
    try {
      await apiFetch(`/api/content/${dateStr}`, { method: 'DELETE' });
      setPlans(prev => {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      });
      setSelectedDate(null);
      showToast('Day deleted.');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  // ── Toggle important ───────────────────────
  const handleToggleImportant = async (dateStr) => {
    const current = plans[dateStr] || emptyDay(dateStr);
    const next    = !current.isImportant;
    setPlans(prev => ({ ...prev, [dateStr]: { ...current, isImportant: next } }));
    try {
      await apiFetch(`/api/content/${dateStr}/important`, {
        method: 'PATCH',
        body: JSON.stringify({ isImportant: next }),
      });
    } catch (err) {
      showToast('Could not update: ' + err.message, 'error');
    }
  };

  // ── Stickers ───────────────────────────────
  const handleAddSticker = async (dateStr, pastelKey) => {
    const current  = plans[dateStr] || emptyDay(dateStr);
    const already  = (current.stickers || []).find(s => s.pastelKey === pastelKey);
    if (already) return; // don't double-add same sticker
    const stickers = [...(current.stickers || []), { pastelKey, label: PASTEL_STICKERS[pastelKey].label }];
    setPlans(prev => ({ ...prev, [dateStr]: { ...current, stickers } }));
    setShowStickerPicker(false);
    try {
      await apiFetch(`/api/content/${dateStr}/stickers`, {
        method: 'PATCH',
        body: JSON.stringify({ stickers }),
      });
    } catch (err) {
      showToast('Sticker save failed: ' + err.message, 'error');
    }
  };

  const handleRemoveSticker = async (dateStr, pastelKey) => {
    const current  = plans[dateStr] || emptyDay(dateStr);
    const stickers = (current.stickers || []).filter(s => s.pastelKey !== pastelKey);
    setPlans(prev => ({ ...prev, [dateStr]: { ...current, stickers } }));
    try {
      await apiFetch(`/api/content/${dateStr}/stickers`, {
        method: 'PATCH',
        body: JSON.stringify({ stickers }),
      });
    } catch (err) {
      showToast('Sticker remove failed: ' + err.message, 'error');
    }
  };

  // ── Posts ──────────────────────────────────
  const handleAddPost = () => {
    const current = plans[selectedDate] || emptyDay(selectedDate);
    const newPost = {
      clientId: makeId(),
      time: '18:00', type: 'photo', product: '',
      goal: '', script: '', caption: '',
      hashtags: [], photoUrls: [], status: 'draft',
      metrics: { reach: 0, impressions: 0, likes: 0, comments: 0, saves: 0, shares: 0 },
    };
    const updated = { ...current, posts: [...(current.posts || []), newPost] };
    setPlans(prev => ({ ...prev, [selectedDate]: updated }));
    setExpandedPosts(prev => new Set(prev).add(newPost.clientId));
    scheduleSave(selectedDate, updated);
  };

  const handleUpdatePost = (clientId, field, value) => {
    const current = plans[selectedDate] || emptyDay(selectedDate);
    const posts   = current.posts.map(p =>
      p.clientId === clientId ? { ...p, [field]: value } : p
    );
    const updated = { ...current, posts };
    setPlans(prev => ({ ...prev, [selectedDate]: updated }));
    scheduleSave(selectedDate, updated);
  };

  const handleDeletePost = (clientId) => {
    if (!window.confirm('Delete this post?')) return;
    const current = plans[selectedDate] || emptyDay(selectedDate);
    const posts   = current.posts.filter(p => p.clientId !== clientId);
    const updated = { ...current, posts };
    setPlans(prev => ({ ...prev, [selectedDate]: updated }));
    scheduleSave(selectedDate, updated);
  };

  // Quick status via dedicated endpoint (tiny request)
  const handleStatusChange = async (clientId, status) => {
    handleUpdatePost(clientId, 'status', status);
    try {
      await apiFetch(`/api/content/${selectedDate}/posts/${clientId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (_) { /* debounced full save will catch it */ }
  };

  // ── Metrics ───────────────────────────────
  const handleUpdateMetrics = async (clientId, field, value) => {
    const current = plans[selectedDate] || emptyDay(selectedDate);
    const posts   = current.posts.map(p =>
      p.clientId === clientId
        ? { ...p, metrics: { ...p.metrics, [field]: Number(value) } }
        : p
    );
    const updated = { ...current, posts };
    setPlans(prev => ({ ...prev, [selectedDate]: updated }));
    scheduleSave(selectedDate, updated);
  };

  // ── Hashtags ──────────────────────────────
  const handleAddHashtag = (e, clientId) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.target.value.trim();
    if (!val) return;
    const tag  = val.startsWith('#') ? val : '#' + val;
    const post = (plans[selectedDate]?.posts || []).find(p => p.clientId === clientId);
    if (!post) return;
    handleUpdatePost(clientId, 'hashtags', [...(post.hashtags || []), tag]);
    e.target.value = '';
  };

  const handleRemoveHashtag = (clientId, idx) => {
    const post = (plans[selectedDate]?.posts || []).find(p => p.clientId === clientId);
    if (!post) return;
    const hashtags = [...(post.hashtags || [])];
    hashtags.splice(idx, 1);
    handleUpdatePost(clientId, 'hashtags', hashtags);
  };

  // ── Photo upload → Cloudinary ─────────────
  const handlePhotoUpload = async (clientId, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPost(clientId);
    try {
      const urls = await Promise.all(files.map(uploadToCloudinary));
      const post = (plans[selectedDate]?.posts || []).find(p => p.clientId === clientId);
      if (!post) return;
      handleUpdatePost(clientId, 'photoUrls', [...(post.photoUrls || []), ...urls]);
      showToast(`${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded!`);
    } catch (err) {
      showToast('Photo upload failed: ' + err.message, 'error');
    } finally {
      setUploadingPost(null);
      e.target.value = null;
    }
  };

  const handleRemovePhoto = (clientId, idx) => {
    const post = (plans[selectedDate]?.posts || []).find(p => p.clientId === clientId);
    if (!post) return;
    const photoUrls = [...(post.photoUrls || [])];
    photoUrls.splice(idx, 1);
    handleUpdatePost(clientId, 'photoUrls', photoUrls);
  };

  // ── Filters ───────────────────────────────
  const toggleFilter = (type) => {
    const next = new Set(activeFilters);
    next.has(type) ? next.delete(type) : next.add(type);
    setActiveFilters(next);
  };

  // ─────────────────────────────────────────────────────────
  // RENDER: Mini Calendar
  // ─────────────────────────────────────────────────────────
  const renderMiniCalendar = () => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay    = getFirstDay(year, month);
    const today       = new Date();

    const blanks = Array.from({ length: firstDay }, (_, i) => (
      <div key={`b${i}`} className="aspect-square" />
    ));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d       = i + 1;
      const dateStr = toDateStr(year, month, d);
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      const isSel   = selectedDate === dateStr;
      const dayPlan = plans[dateStr];
      const hasPosts = dayPlan?.posts?.length > 0;
      const isImp    = dayPlan?.isImportant;
      const stickers = dayPlan?.stickers || [];

      return (
        <button
          key={d}
          onClick={() => handleDayClick(dateStr)}
          style={{
            background: isSel ? ROSE : isImp ? '#fde8ff' : 'transparent',
            color: isSel ? '#fff' : isImp ? '#7e22ce' : DARK,
            border: isToday && !isSel ? `2px solid ${PINK}` : '2px solid transparent',
            borderRadius: '50%',
            fontWeight: (isToday || isSel) ? 700 : 400,
            fontSize: '0.72rem',
            position: 'relative',
            aspectRatio: '1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {d}
          {/* Dot row: posts + sticker count */}
          <div style={{ display: 'flex', gap: 2, position: 'absolute', bottom: 2 }}>
            {hasPosts && (
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: isSel ? '#fff' : ROSE,
              }} />
            )}
            {stickers.length > 0 && (
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: isSel ? '#fff' : '#7e22ce',
              }} />
            )}
          </div>
        </button>
      );
    });

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => changeMonth(-1)} style={btnIcon}><ChevronLeft size={16} /></button>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: '1rem', color: DARK }}>
            {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} style={btnIcon}><ChevronRight size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center', marginBottom: 6 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ fontSize: '0.6rem', fontWeight: 700, color: MID, textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {blanks}{days}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // RENDER: Overview grid
  // ─────────────────────────────────────────────────────────
  const renderOverview = () => {
    const dates = Object.keys(plans).sort();

    return (
      <div style={{ padding: isMobile ? 16 : 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 700, color: DARK, margin: 0 }}>
              Content Calendar
            </h2>
            <p style={{ color: MID, fontSize: '0.8rem', margin: '4px 0 0', fontStyle: 'italic' }}>
              Plan, track and measure every piece of content
            </p>
          </div>
          {!isMobile && (
          <button
            onClick={() => { setNewDayDate(new Date().toISOString().split('T')[0]); setAddDayModal(true); }}
            style={btnPrimary}
          >
            <Plus size={15} /> Plan a Day
          </button>
          )}
        </div>

        {dates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 16, border: `1px solid ${CREAM}` }}>
            <CalendarIcon size={44} color={LIGHT} style={{ marginBottom: 12 }} />
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: DARK }}>Your planner is empty</h3>
            <p style={{ color: MID, fontSize: '0.85rem', marginBottom: 20 }}>Tap a day on the calendar or click below to get started.</p>
            <button onClick={() => { setNewDayDate(new Date().toISOString().split('T')[0]); setAddDayModal(true); }} style={btnPrimary}>
              + Plan First Day
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {dates.map(dateStr => {
              const day    = plans[dateStr];
              const date   = parseDateStr(dateStr);
              const posts  = (day.posts || []).filter(p => activeFilters.has(p.type));
              const stickers = day.stickers || [];

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    background: '#fff',
                    border: `1px solid ${day.isImportant ? '#c4b5fd' : CREAM}`,
                    borderRadius: 14,
                    padding: 18,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    boxShadow: day.isImportant ? '0 0 0 2px #ede9fe' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(190,24,93,0.10)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = day.isImportant ? '0 0 0 2px #ede9fe' : 'none'}
                >
                  {/* Date header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    {day.isImportant && <Star size={13} fill="#7e22ce" color="#7e22ce" />}
                  </div>

                  {/* Theme */}
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', color: DARK, marginBottom: 10, lineHeight: 1.3 }}>
                    {day.theme || <span style={{ color: LIGHT, fontStyle: 'italic' }}>No theme set</span>}
                  </div>

                  {/* Stickers */}
                  {stickers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {stickers.map(s => {
                        const def = PASTEL_STICKERS[s.pastelKey];
                        if (!def) return null;
                        return (
                          <span key={s.pastelKey} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: def.bg, color: def.color }}>
                            {def.emoji} {def.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Posts preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {posts.length === 0
                      ? <span style={{ fontSize: '0.72rem', color: '#aaa', fontStyle: 'italic' }}>No posts yet</span>
                      : posts.slice(0, 3).map(p => {
                          const t = POST_TYPES[p.type];
                          return (
                            <div key={p.clientId} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: t.bg, color: t.color, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                              {t.label}{p.product ? ': ' + p.product.substring(0, 18) : ''}
                            </div>
                          );
                        })
                    }
                    {posts.length > 3 && <div style={{ fontSize: '0.68rem', color: MID }}>+{posts.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // RENDER: Day Detail
  // ─────────────────────────────────────────────────────────
  const renderDayDetail = () => {
    const day     = plans[selectedDate] || emptyDay(selectedDate);
    const dateObj = parseDateStr(selectedDate);
    const posts   = (day.posts || []).filter(p => activeFilters.has(p.type));

    return (
      <div style={{ padding: isMobile ? 16 : 24 }}>
        {/* Back */}
        <button onClick={() => setSelectedDate(null)} style={{ ...btnIcon, marginBottom: 20, color: MID, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={15} /> Back to Overview
        </button>

        {/* Day Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${CREAM}`, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, background: DARK, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: '#fff', flexShrink: 0 }}>
            {dateObj.getDate()}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' })}
            </div>
            <input
              value={day.theme}
              onChange={e => updateDay('theme', e.target.value)}
              placeholder="Add a theme or focus for this day…"
              style={{ width: '100%', border: 'none', outline: 'none', fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: DARK, background: 'transparent', fontStyle: day.theme ? 'normal' : 'italic' }}
            />
          </div>
          {/* Important toggle */}
          <button
            onClick={() => handleToggleImportant(selectedDate)}
            title="Mark as important"
            style={{ ...btnIcon, color: day.isImportant ? '#7e22ce' : LIGHT }}
          >
            <Star size={20} fill={day.isImportant ? '#7e22ce' : 'none'} />
          </button>
          {/* Delete day */}
          <button onClick={() => handleDeleteDay(selectedDate)} style={{ ...btnIcon, color: '#dc2626' }} title="Delete this day">
            <Trash2 size={18} />
          </button>
        </div>

        {/* Stickers row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
          {(day.stickers || []).map(s => {
            const def = PASTEL_STICKERS[s.pastelKey];
            if (!def) return null;
            return (
              <span key={s.pastelKey} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: def.bg, color: def.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {def.emoji} {def.label}
                <button onClick={() => handleRemoveSticker(selectedDate, s.pastelKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: def.color, padding: 0, lineHeight: 1 }}>
                  <X size={11} />
                </button>
              </span>
            );
          })}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStickerPicker(v => !v)}
              style={{ ...btnOutline, fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Smile size={13} /> Add Sticker
            </button>
            {showStickerPicker && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                background: '#fff', borderRadius: 14, border: `1px solid ${CREAM}`,
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: 14,
                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, width: 280,
              }}>
                {Object.entries(PASTEL_STICKERS).map(([key, def]) => (
                  <button
                    key={key}
                    onClick={() => handleAddSticker(selectedDate, key)}
                    title={def.label}
                    style={{
                      background: def.bg, border: 'none', borderRadius: 10,
                      padding: '8px 4px', cursor: 'pointer', display: 'flex',
                      flexDirection: 'column', alignItems: 'center', gap: 3,
                      fontSize: '1.2rem', transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {def.emoji}
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: def.color }}>{def.label}</span>
                  </button>
                ))}
                <button onClick={() => setShowStickerPicker(false)} style={{ ...btnIcon, gridColumn: 'span 5', fontSize: '0.7rem', color: MID }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: LIGHT, fontSize: '0.85rem', fontStyle: 'italic' }}>
              No posts yet for this day. Add one below.
            </div>
          )}
          {posts.map(post => renderPost(post, selectedDate))}
        </div>

        <button onClick={handleAddPost} style={btnDashed}>
          <Plus size={15} /> Add Post
        </button>

        {/* Day Notes */}
        <div style={{ marginTop: 28 }}>
          <label style={labelStyle}>Day Notes & To-Do</label>
          <textarea
            value={day.notes}
            onChange={e => updateDay('notes', e.target.value)}
            placeholder="Props needed, reminders, shoot logistics…"
            style={{ ...textareaStyle, minHeight: 90 }}
          />
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // RENDER: Single Post Card
  // ─────────────────────────────────────────────────────────
  const renderPost = (post, dateStr) => {
    const isExpanded    = expandedPosts.has(post.clientId);
    const metricsOpen   = expandedMetrics.has(post.clientId);
    const typeObj       = POST_TYPES[post.type] || POST_TYPES.photo;
    const isUploading   = uploadingPost === post.clientId;

    const toggleExpand = () => {
      const next = new Set(expandedPosts);
      next.has(post.clientId) ? next.delete(post.clientId) : next.add(post.clientId);
      setExpandedPosts(next);
    };

    const toggleMetrics = (e) => {
      e.stopPropagation();
      const next = new Set(expandedMetrics);
      next.has(post.clientId) ? next.delete(post.clientId) : next.add(post.clientId);
      setExpandedMetrics(next);
    };

    const statusColors = {
      draft:  { bg: '#f3f4f6', color: '#6b7280' },
      ready:  { bg: '#fef9c3', color: '#854d0e' },
      posted: { bg: '#dcfce7', color: '#15803d' },
    };
    const sc = statusColors[post.status] || statusColors.draft;

    return (
      <div key={post.clientId} style={{ background: '#fff', border: `1px solid ${CREAM}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>

        {/* Collapsed header */}
        <div
          onClick={toggleExpand}
          style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 12, flexWrap: 'wrap' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: ROSE, fontSize: '0.85rem', minWidth: 40 }}>{post.time}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: typeObj.bg, color: typeObj.color }}>
              {typeObj.label}
            </span>
            <span style={{ fontWeight: 600, color: DARK, fontSize: '0.85rem' }}>{post.product || 'Untitled'}</span>
            {(post.photoUrls || []).length > 0 && (
              <span style={{ fontSize: '0.7rem', color: MID, display: 'flex', alignItems: 'center', gap: 3 }}>
                <ImageIcon size={11} /> {post.photoUrls.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {post.status === 'posted' && (
              <button
                onClick={toggleMetrics}
                style={{ ...btnIcon, fontSize: '0.68rem', color: MID, display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <BarChart2 size={13} /> Metrics
              </button>
            )}
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: sc.bg, color: sc.color }}>
              {post.status.toUpperCase()}
            </span>
            {isExpanded ? <ChevronUp size={16} color={MID} /> : <ChevronDown size={16} color={MID} />}
          </div>
        </div>

        {/* Metrics panel (only when posted) */}
        {post.status === 'posted' && metricsOpen && (
          <div style={{ padding: '14px 18px', background: '#fafafa', borderTop: `1px solid ${CREAM}` }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Performance Metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {['reach','impressions','likes','comments','saves','shares'].map(field => (
                <div key={field}>
                  <label style={{ ...labelStyle, marginBottom: 3 }}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                  <input
                    type="number"
                    min="0"
                    value={post.metrics?.[field] || 0}
                    onChange={e => handleUpdateMetrics(post.clientId, field, e.target.value)}
                    style={{ ...inputStyle, textAlign: 'center' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded body */}
        {isExpanded && (
          <div style={{ padding: '18px', borderTop: `1px solid ${CREAM}`, background: '#fffbfd' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>

              {/* Left col */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <input type="time" value={post.time} onChange={e => handleUpdatePost(post.clientId, 'time', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Post Type</label>
                    <select value={post.type} onChange={e => handleUpdatePost(post.clientId, 'type', e.target.value)} style={inputStyle}>
                      {Object.entries(POST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Product / Topic</label>
                  <input type="text" value={post.product} onChange={e => handleUpdatePost(post.clientId, 'product', e.target.value)} style={inputStyle} placeholder="What is this post about?" />
                </div>

                <div>
                  <label style={labelStyle}>Goal</label>
                  <textarea value={post.goal} onChange={e => handleUpdatePost(post.clientId, 'goal', e.target.value)} style={{ ...textareaStyle, minHeight: 60 }} placeholder="e.g. Educate on soy wax vs paraffin" />
                </div>

                <div>
                  <label style={labelStyle}>Status</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['draft', 'ready', 'posted'].map(s => (
                      <button key={s} onClick={() => handleStatusChange(post.clientId, s)}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                          background: post.status === s ? DARK : '#fff',
                          color: post.status === s ? '#fff' : MID,
                          border: `1px solid ${post.status === s ? DARK : CREAM}`,
                        }}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <label style={labelStyle}>Reference Photos</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(post.photoUrls || []).map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: `1px solid ${CREAM}` }}>
                        <img src={url} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => handleRemovePhoto(post.clientId, idx)}
                          style={{ position: 'absolute', top: 2, right: 2, background: '#dc2626', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={9} color="#fff" />
                        </button>
                      </div>
                    ))}
                    <label style={{
                      width: 64, height: 64, borderRadius: 10, border: `2px dashed ${LIGHT}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: isUploading ? 'wait' : 'pointer', color: MID, fontSize: '0.6rem', fontWeight: 700, gap: 3,
                    }}>
                      {isUploading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Upload size={16} /><span>ADD</span></>}
                      <input type="file" multiple accept="image/*" style={{ display: 'none' }} disabled={isUploading} onChange={e => handlePhotoUpload(post.clientId, e)} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right col */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {post.type !== 'photo' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label style={labelStyle}>Script / Screen Text</label>
                      <button onClick={() => copyToClipboard(post.script, 'Script')} style={copyBtn}><Copy size={11} /> Copy</button>
                    </div>
                    <textarea value={post.script} onChange={e => handleUpdatePost(post.clientId, 'script', e.target.value)} style={{ ...textareaStyle, minHeight: 100 }} placeholder="Write voiceover or text overlays here…" />
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={labelStyle}>Caption</label>
                    <button onClick={() => copyToClipboard(post.caption, 'Caption')} style={copyBtn}><Copy size={11} /> Copy</button>
                  </div>
                  <textarea value={post.caption} onChange={e => handleUpdatePost(post.clientId, 'caption', e.target.value)} style={{ ...textareaStyle, minHeight: 100 }} placeholder="Instagram / TikTok caption…" />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={labelStyle}>Hashtags</label>
                    <button onClick={() => copyToClipboard((post.hashtags || []).join(' '), 'Hashtags')} style={copyBtn}><Copy size={11} /> Copy All</button>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#fff', border: `1px solid ${CREAM}`, borderRadius: 10, minHeight: 40, display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {(post.hashtags || []).map((tag, i) => (
                      <span key={i} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: PALE, color: ROSE, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {tag}
                        <button onClick={() => handleRemoveHashtag(post.clientId, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: ROSE }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <input type="text" onKeyDown={e => handleAddHashtag(e, post.clientId)} placeholder="Type hashtag and press Enter…" style={inputStyle} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button onClick={() => handleDeletePost(post.clientId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={13} /> Delete Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────
  const totalPosts  = Object.values(plans).reduce((s, d) => s + (d.posts?.length || 0), 0);
  const postedCount = Object.values(plans).reduce((s, d) => s + (d.posts?.filter(p => p.status === 'posted').length || 0), 0);
  const readyCount  = Object.values(plans).reduce((s, d) => s + (d.posts?.filter(p => p.status === 'ready').length || 0), 0);

  // ─────────────────────────────────────────────────────────
  // SHARED STYLE OBJECTS
  // ─────────────────────────────────────────────────────────
  const btnPrimary = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: ROSE, color: '#fff', border: 'none', borderRadius: 10,
    padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif',
  };
  const btnOutline = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fff', color: MID, border: `1px solid ${CREAM}`, borderRadius: 10,
    padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif',
  };
  const btnIcon = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: MID, transition: 'background 0.15s',
    fontFamily: 'Montserrat, sans-serif',
  };
  const btnDashed = {
    width: '100%', padding: '13px 0', border: `2px dashed ${LIGHT}`, borderRadius: 12,
    background: 'none', color: MID, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'border-color 0.15s, color 0.15s',
    fontFamily: 'Montserrat, sans-serif',
  };
  const labelStyle = {
    display: 'block', fontSize: '0.65rem', fontWeight: 700, color: MID,
    textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5,
  };
  const inputStyle = {
    width: '100%', padding: '8px 10px', border: `1px solid ${CREAM}`,
    borderRadius: 8, fontSize: '0.82rem', outline: 'none', color: DARK,
    fontFamily: 'Montserrat, sans-serif', background: '#fff',
    boxSizing: 'border-box',
  };
  const textareaStyle = {
    ...inputStyle, resize: 'vertical', lineHeight: 1.5,
  };
  const copyBtn = {
    background: 'none', border: 'none', cursor: 'pointer', color: ROSE,
    fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3,
    fontFamily: 'Montserrat, sans-serif',
  };

  // ─────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: MID }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading your content plan…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // MAIN LAYOUT
  // ─────────────────────────────────────────────────────────
  // ── Sidebar content (shared between desktop + mobile drawer) ──
  const renderSidebarContent = () => (
    <>
      {/* Calendar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, borderBottom: `1px solid ${CREAM}`, paddingBottom: 8 }}>
          Calendar
        </div>
        {renderMiniCalendar()}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, borderBottom: `1px solid ${CREAM}`, paddingBottom: 8 }}>
          Filter Types
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(POST_TYPES).map(([key, obj]) => (
            <button key={key} onClick={() => toggleFilter(key)}
              style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                cursor: 'pointer', border: `1px solid ${obj.color}30`,
                background: obj.bg, color: obj.color,
                opacity: activeFilters.has(key) ? 1 : 0.35,
                transition: 'opacity 0.15s',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >{obj.label}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: MID, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, borderBottom: `1px solid ${CREAM}`, paddingBottom: 8 }}>
          Content Stats
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Total Planned', val: totalPosts,  color: DARK },
            { label: 'Ready',         val: readyCount,  color: '#854d0e' },
            { label: 'Posted',        val: postedCount, color: '#15803d' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
              <span style={{ color: MID }}>{label}</span>
              <span style={{ fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
          <div style={{ background: CREAM, height: 6, borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ background: ROSE, height: '100%', width: `${totalPosts ? (postedCount / totalPosts) * 100 : 0}%`, transition: 'width 0.4s', borderRadius: 99 }} />
          </div>
        </div>
      </div>

      {saving && (
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 6, color: MID, fontSize: '0.72rem' }}>
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Montserrat, sans-serif', position: 'relative' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus, textarea:focus, select:focus {
          border-color: ${PINK} !important;
          outline: none;
        }
        textarea { resize: vertical; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: ${PALE}; }
        ::-webkit-scrollbar-thumb { background: ${LIGHT}; border-radius: 99px; }
      `}</style>

      {/* ── MOBILE: Top bar with calendar toggle ── */}
      {isMobile && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${CREAM}`,
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: '1.1rem', color: DARK }}>
              Content Planner
            </div>
            {saving && (
              <div style={{ fontSize: '0.65rem', color: MID, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setNewDayDate(new Date().toISOString().split('T')[0]); setAddDayModal(true); }}
              style={{ ...btnPrimary, padding: '8px 14px', fontSize: '0.75rem' }}
            >
              <Plus size={13} /> Plan Day
            </button>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              style={{ ...btnOutline, padding: '8px 12px' }}
              title="Calendar & Filters"
            >
              <CalendarIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE: Slide-down sidebar drawer ── */}
      {isMobile && sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.35)', zIndex: 40 }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
            background: '#fff', borderRadius: '0 0 20px 20px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            padding: '20px 20px 28px',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: '1.1rem', color: DARK }}>
                Calendar & Filters
              </span>
              <button onClick={() => setSidebarOpen(false)} style={btnIcon}><X size={18} /></button>
            </div>
            {renderSidebarContent()}
          </div>
        </>
      )}

      {/* ── DESKTOP + MOBILE body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Desktop sidebar — hidden on mobile */}
        {!isMobile && (
          <div style={{
            width: 260, flexShrink: 0, background: '#fff',
            borderRight: `1px solid ${CREAM}`, display: 'flex',
            flexDirection: 'column', overflowY: 'auto', padding: '20px 16px',
          }}>
            {renderSidebarContent()}
          </div>
        )}

        {/* ── Main area ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: PALE, minWidth: 0 }}>
          {selectedDate ? renderDayDetail() : renderOverview()}
        </div>

      </div>

      {/* ── Add Day Modal ── */}
      {addDayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,16,35,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: DARK, margin: '0 0 6px' }}>Plan a Day</h3>
            <p style={{ color: MID, fontSize: '0.8rem', marginBottom: 20 }}>Pick a date to start planning content for it.</p>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={newDayDate}
              onChange={e => setNewDayDate(e.target.value)}
              style={{ ...inputStyle, marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setAddDayModal(false)} style={{ ...btnOutline, flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={handleConfirmAddDay} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>Go to Day</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 200,
        background: toast.type === 'error' ? '#dc2626' : DARK,
        color: '#fff', padding: '10px 18px', borderRadius: 10,
        fontSize: '0.82rem', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: toast.msg ? 1 : 0,
        transform: toast.msg ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.25s, transform 0.25s',
        pointerEvents: 'none',
      }}>
        {toast.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
        {toast.msg}
      </div>
    </div>
  );
}