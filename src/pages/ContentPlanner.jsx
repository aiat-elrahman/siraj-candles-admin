import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Video, Music, Image as ImageIcon, 
  Instagram, Store, Plus, ChevronLeft, ChevronRight, X, 
  Copy, Save, Trash2, ChevronDown, ChevronUp, Camera 
} from 'lucide-react';

// ── Admin Theme Colors ──
const DARK  = '#1E1023';
const PINK  = '#F472B6';
const ROSE  = '#BE185D';
const PALE  = '#FFF0F6';
const MID   = '#6B4A6E';
const CREAM = '#FCE7F3';

const POST_TYPES = {
  vo: { label: 'Voiceover', icon: Video, color: ROSE, bg: PALE },
  music: { label: 'Music Reel', icon: Music, color: '#0369a1', bg: '#e0f2fe' },
  carousel: { label: 'Carousel', icon: ImageIcon, color: '#854d0e', bg: '#fef9c3' },
  photo: { label: 'Photo', icon: Camera, color: '#15803d', bg: '#dcfce7' },
  story: { label: 'Story', icon: Instagram, color: MID, bg: CREAM },
  bazaar: { label: 'Bazaar', icon: Store, color: '#991b1b', bg: '#fee2e2' },
};

export default function ContentPlanner() {
  const [plan, setPlan] = useState(() => {
    const saved = localStorage.getItem('sirajContentPlan');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentMonth, setCurrentMonth] = useState({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() 
  });
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set(Object.keys(POST_TYPES)));
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('sirajContentPlan', JSON.stringify(plan));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast("Storage full! Please delete some old photos.");
      }
    }
  }, [plan]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || '');
    showToast(`Copied ${label}!`);
  };

  const changeMonth = (dir) => {
    setCurrentMonth(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 11) { m = 0; y++; }
      if (m < 0) { m = 11; y--; }
      return { year: y, month: m };
    });
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (year, month) => new Date(year, month, 1).getDay();

  const handleAddDay = () => {
    const dateStr = window.prompt('Enter date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    
    if (!plan[dateStr]) {
      setPlan(prev => ({ ...prev, [dateStr]: { theme: '', notes: '', posts: [] } }));
    }
    setSelectedDate(dateStr);
  };

  const handleAddPost = (dateStr) => {
    const newPost = {
      id: 'p' + Date.now(),
      time: '18:00', type: 'photo', product: 'New Product',
      goal: '', screenText: '', script: '', caption: '', hashtags: [], photos: [], status: 'draft'
    };
    setPlan(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], posts: [...(prev[dateStr].posts || []), newPost] }
    }));
    setExpandedPosts(prev => new Set(prev).add(newPost.id));
  };

  const handleUpdatePost = (dateStr, postId, field, value) => {
    setPlan(prev => {
      const day = { ...prev[dateStr] };
      day.posts = day.posts.map(p => p.id === postId ? { ...p, [field]: value } : p);
      return { ...prev, [dateStr]: day };
    });
  };

  const handleDeletePost = (dateStr, postId) => {
    if(!window.confirm("Delete this post?")) return;
    setPlan(prev => {
      const day = { ...prev[dateStr] };
      day.posts = day.posts.filter(p => p.id !== postId);
      return { ...prev, [dateStr]: day };
    });
  };

  const handleAddHashtag = (e, dateStr, postId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (!val) return;
      const tag = val.startsWith('#') ? val : '#' + val;
      
      setPlan(prev => {
        const day = { ...prev[dateStr] };
        day.posts = day.posts.map(p => {
          if (p.id === postId) {
            return { ...p, hashtags: [...(p.hashtags || []), tag] };
          }
          return p;
        });
        return { ...prev, [dateStr]: day };
      });
      e.target.value = '';
    }
  };

  const handleRemoveHashtag = (dateStr, postId, tagIndex) => {
    setPlan(prev => {
      const day = { ...prev[dateStr] };
      day.posts = day.posts.map(p => {
        if (p.id === postId) {
          const newTags = [...p.hashtags];
          newTags.splice(tagIndex, 1);
          return { ...p, hashtags: newTags };
        }
        return p;
      });
      return { ...prev, [dateStr]: day };
    });
  };

  // ── PHOTO UPLOAD LOGIC ──
  const handleAddPhotos = (dateStr, postId, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Simple compression using canvas to avoid hitting localStorage limits
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; // Resize for storage limits
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

          setPlan(prev => {
            const day = { ...prev[dateStr] };
            day.posts = day.posts.map(p => {
              if (p.id === postId) {
                return { ...p, photos: [...(p.photos || []), compressedDataUrl] };
              }
              return p;
            });
            return { ...prev, [dateStr]: day };
          });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = null; 
  };

  const handleRemovePhoto = (dateStr, postId, photoIndex) => {
    setPlan(prev => {
      const day = { ...prev[dateStr] };
      day.posts = day.posts.map(p => {
        if (p.id === postId) {
          const newPhotos = [...(p.photos || [])];
          newPhotos.splice(photoIndex, 1);
          return { ...p, photos: newPhotos };
        }
        return p;
      });
      return { ...prev, [dateStr]: day };
    });
  };

  const toggleFilter = (type) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(type)) newFilters.delete(type);
    else newFilters.add(type);
    setActiveFilters(newFilters);
  };

  const togglePostExpand = (postId) => {
    const newExp = new Set(expandedPosts);
    if (newExp.has(postId)) newExp.delete(postId);
    else newExp.add(postId);
    setExpandedPosts(newExp);
  };

  const renderMiniCalendar = () => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDay(year, month);
    const today = new Date();

    const blanks = Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} className="aspect-square"></div>);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      const isSelected = selectedDate === dateStr;
      const hasPost = plan[dateStr] && plan[dateStr].posts?.length > 0;

      return (
        <button 
          key={d}
          onClick={() => setSelectedDate(dateStr)}
          className={`aspect-square flex flex-col items-center justify-center rounded-full text-xs transition relative
            ${isSelected ? 'bg-[#BE185D] text-white font-bold shadow-md' : 'hover:bg-[#FCE7F3] text-[#1E1023]'}
            ${isToday && !isSelected ? 'border-2 border-[#F472B6] font-bold text-[#BE185D]' : ''}
          `}
        >
          {d}
          {hasPost && <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-[#BE185D]'}`}></span>}
        </button>
      );
    });

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-[#FCE7F3] rounded text-[#6B4A6E]"><ChevronLeft size={18}/></button>
          <span className="font-serif font-bold text-lg text-[#1E1023]">
            {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-1 hover:bg-[#FCE7F3] rounded text-[#6B4A6E]"><ChevronRight size={18}/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2 text-[10px] font-bold text-[#6B4A6E] uppercase">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {blanks}{days}
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    const dates = Object.keys(plan).sort();
    
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold text-[#1E1023]">Content Calendar</h2>
            <p className="text-sm text-[#6B4A6E] italic mt-1">Plan your posts, reels, and bazaars</p>
          </div>
          <button onClick={handleAddDay} className="flex items-center gap-2 bg-[#BE185D] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-[#9d174d] transition">
            <Plus size={16} /> Plan a Day
          </button>
        </div>

        {dates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[#FCE7F3]">
            <CalendarIcon size={48} className="mx-auto text-[#D8B4D8] mb-4" />
            <h3 className="text-xl font-serif text-[#1E1023] mb-2">Your planner is empty</h3>
            <p className="text-[#6B4A6E] text-sm mb-6">Start by planning a day to schedule your content.</p>
            <button onClick={handleAddDay} className="bg-[#1E1023] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-black transition">
              + Plan First Day
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dates.map(dateStr => {
              const day = plan[dateStr];
              const date = new Date(dateStr);
              const posts = (day.posts || []).filter(p => activeFilters.has(p.type));
              
              return (
                <div 
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className="bg-white border border-[#FCE7F3] rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-[#F472B6] transition"
                >
                  <div className="text-[11px] font-bold text-[#6B4A6E] uppercase tracking-wider mb-1">
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="font-serif text-xl text-[#1E1023] mb-4 leading-tight">
                    {day.theme || 'Untitled Theme'}
                  </div>
                  <div className="flex flex-col gap-2">
                    {posts.length === 0 ? <span className="text-xs text-gray-400 italic">No posts match filters</span> : null}
                    {posts.slice(0,3).map(p => {
                      const typeObj = POST_TYPES[p.type];
                      return (
                        <div key={p.id} className="text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 w-max" style={{ backgroundColor: typeObj.bg, color: typeObj.color }}>
                          {typeObj.label}: {p.product.substring(0, 20)}
                        </div>
                      );
                    })}
                    {posts.length > 3 && <div className="text-[10px] text-[#6B4A6E] mt-1">+{posts.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderDayDetail = () => {
    const day = plan[selectedDate] || { theme: '', notes: '', posts: [] };
    const dateObj = new Date(selectedDate);
    const posts = (day.posts || []).filter(p => activeFilters.has(p.type));

    return (
      <div className="p-6">
        <button onClick={() => setSelectedDate(null)} className="flex items-center gap-1 text-sm font-bold text-[#6B4A6E] hover:text-[#BE185D] mb-6">
          <ChevronLeft size={16} /> Back to Overview
        </button>

        <div className="flex items-center gap-5 mb-8 pb-6 border-b border-[#FCE7F3]">
          <div className="w-16 h-16 bg-[#1E1023] rounded-2xl flex items-center justify-center font-serif text-3xl text-white shadow-md">
            {dateStrParts(selectedDate).day}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-serif text-[#1E1023] mb-1">
              {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' })}
            </h2>
            <input 
              type="text" 
              value={day.theme} 
              onChange={e => setPlan(p => ({ ...p, [selectedDate]: { ...p[selectedDate], theme: e.target.value } }))}
              placeholder="What is the main theme/focus for today?"
              className="w-full text-sm text-[#6B4A6E] italic bg-transparent border-none outline-none placeholder-[#D8B4D8]"
            />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {posts.map(post => {
            const isExpanded = expandedPosts.has(post.id);

            return (
              <div key={post.id} className="bg-white border border-[#FCE7F3] rounded-xl overflow-hidden shadow-sm">
                
                {/* Header (Collapsed View) */}
                <div 
                  onClick={() => togglePostExpand(post.id)}
                  className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[#FFF0F6] transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#BE185D] text-sm">{post.time}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider" style={{ background: POST_TYPES[post.type].bg, color: POST_TYPES[post.type].color }}>
                      {POST_TYPES[post.type].label}
                    </span>
                    <span className="font-bold text-[#1E1023] text-sm">{post.product || 'Untitled'}</span>
                    {post.photos && post.photos.length > 0 && (
                      <span className="text-xs text-[#6B4A6E] flex items-center gap-1"><ImageIcon size={12}/> {post.photos.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${post.status === 'posted' ? 'bg-[#dcfce7] text-[#15803d]' : post.status === 'ready' ? 'bg-[#fef9c3] text-[#854d0e]' : 'bg-gray-100 text-gray-600'}`}>
                      {post.status.toUpperCase()}
                    </span>
                    {isExpanded ? <ChevronUp size={18} className="text-[#6B4A6E]" /> : <ChevronDown size={18} className="text-[#6B4A6E]" />}
                  </div>
                </div>

                {/* Body (Expanded View) */}
                {isExpanded && (
                  <div className="p-5 border-t border-[#FCE7F3] bg-[#FFF0F6] bg-opacity-30 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Left Col: Setup */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider mb-1">Time</label>
                          <input type="time" value={post.time} onChange={e => handleUpdatePost(selectedDate, post.id, 'time', e.target.value)} className="w-full p-2 border border-[#FCE7F3] rounded-lg text-sm outline-none focus:border-[#F472B6]" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider mb-1">Post Type</label>
                          <select value={post.type} onChange={e => handleUpdatePost(selectedDate, post.id, 'type', e.target.value)} className="w-full p-2 border border-[#FCE7F3] rounded-lg text-sm outline-none focus:border-[#F472B6] bg-white">
                            {Object.entries(POST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider mb-1">Product / Topic</label>
                        <input type="text" value={post.product} onChange={e => handleUpdatePost(selectedDate, post.id, 'product', e.target.value)} className="w-full p-2 border border-[#FCE7F3] rounded-lg text-sm outline-none focus:border-[#F472B6]" placeholder="What is this post about?" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider mb-1">Goal</label>
                        <textarea value={post.goal} onChange={e => handleUpdatePost(selectedDate, post.id, 'goal', e.target.value)} className="w-full p-2 border border-[#FCE7F3] rounded-lg text-sm outline-none focus:border-[#F472B6] min-h-[60px]" placeholder="e.g. Educate on soy wax vs paraffin" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider mb-1">Status</label>
                        <div className="flex gap-2">
                          {['draft', 'ready', 'posted'].map(s => (
                            <button key={s} onClick={() => handleUpdatePost(selectedDate, post.id, 'status', s)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize border transition ${post.status === s ? 'bg-[#1E1023] text-white border-[#1E1023]' : 'bg-white text-[#6B4A6E] border-[#FCE7F3] hover:border-[#F472B6]'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Col: Content */}
                    <div className="space-y-4">

                      {/* PHOTOS SECTION */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider">Photos / References</label>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(post.photos || []).map((photoUrl, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#FCE7F3]">
                              <img src={photoUrl} alt="Post ref" className="w-full h-full object-cover" />
                              <button onClick={() => handleRemovePhoto(selectedDate, post.id, idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[#D8B4D8] flex flex-col items-center justify-center cursor-pointer hover:bg-[#FFF0F6] hover:border-[#F472B6] transition text-[#6B4A6E]">
                            <Plus size={16} />
                            <span className="text-[8px] font-bold mt-1">ADD</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleAddPhotos(selectedDate, post.id, e)} />
                          </label>
                        </div>
                      </div>
                      
                      {/* Script / Screen Text */}
                      {post.type !== 'photo' && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider">Voiceover Script / Screen Text</label>
                            <button onClick={() => copyToClipboard(post.script, 'Script')} className="text-xs text-[#BE185D] flex items-center gap-1 hover:underline"><Copy size={12}/> Copy</button>
                          </div>
                          <textarea value={post.script} onChange={e => handleUpdatePost(selectedDate, post.id, 'script', e.target.value)} className="w-full p-2 border border-[#FCE7F3] rounded-lg text-sm outline-none focus:border-[#F472B6] min-h-[100px]" placeholder="Write script or text overlays here..." />
                        </div>
                      )}

                      {/* Caption */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider">Instagram/Tiktok Caption</label>
                          <button onClick={() => copyToClipboard(post.caption, 'Caption')} className="text-xs text-[#BE185D] flex items-center gap-1 hover:underline"><Copy size={12}/> Copy</button>
                        </div>
                        <textarea value={post.caption} onChange={e => handleUpdatePost(selectedDate, post.id, 'caption', e.target.value)} className="w-full p-2 border border-[#FCE7F3] rounded-lg text-sm outline-none focus:border-[#F472B6] min-h-[100px]" placeholder="Write the caption..." />
                      </div>

                      {/* Hashtags */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider">Hashtags</label>
                          <button onClick={() => copyToClipboard((post.hashtags||[]).join(' '), 'Hashtags')} className="text-xs text-[#BE185D] flex items-center gap-1 hover:underline"><Copy size={12}/> Copy All</button>
                        </div>
                        <div className="p-3 bg-white border border-[#FCE7F3] rounded-lg min-h-[42px] flex flex-wrap gap-2 mb-2">
                          {(post.hashtags || []).map((tag, i) => (
                            <span key={i} className="bg-[#FFF0F6] text-[#BE185D] text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                              {tag} <button onClick={() => handleRemoveHashtag(selectedDate, post.id, i)} className="hover:text-black"><X size={10}/></button>
                            </span>
                          ))}
                        </div>
                        <input type="text" onKeyDown={(e) => handleAddHashtag(e, selectedDate, post.id)} placeholder="Type hashtag and press Enter..." className="w-full p-2 border border-[#FCE7F3] rounded-lg text-xs outline-none focus:border-[#F472B6]" />
                      </div>

                      {/* Delete */}
                      <div className="pt-2 flex justify-end">
                        <button onClick={() => handleDeletePost(selectedDate, post.id)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 transition-colors">
                          <Trash2 size={12}/> Delete Post
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={() => handleAddPost(selectedDate)} className="w-full py-3 border-2 border-dashed border-[#D8B4D8] rounded-xl text-[#6B4A6E] font-bold text-sm hover:bg-[#FFF0F6] hover:border-[#F472B6] transition flex items-center justify-center gap-2">
          <Plus size={16} /> Add Another Post to {dateStrParts(selectedDate).dayName}
        </button>

        <div className="mt-8">
          <label className="block text-[10px] font-bold text-[#6B4A6E] uppercase tracking-wider mb-2">Day Notes & To-Do</label>
          <textarea 
            value={day.notes} 
            onChange={e => setPlan(p => ({ ...p, [selectedDate]: { ...p[selectedDate], notes: e.target.value } }))}
            className="w-full p-3 border border-[#FCE7F3] rounded-xl text-sm outline-none focus:border-[#F472B6] min-h-[100px] bg-white shadow-sm" 
            placeholder="Any reminders or props needed for today?" 
          />
        </div>

      </div>
    );
  };

  const dateStrParts = (dStr) => {
    if(!dStr) return {};
    const d = new Date(dStr);
    return {
      day: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  const totalPosts = Object.values(plan).reduce((sum, d) => sum + (d.posts?.length || 0), 0);
  const postedCount = Object.values(plan).reduce((sum, d) => sum + (d.posts?.filter(p => p.status === 'posted').length || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row h-full">
      
      {/* ── Left Sidebar ── */}
      <div className="w-full lg:w-72 bg-white border-r border-[#FCE7F3] flex-shrink-0 p-5 overflow-y-auto">
        
        {/* Calendar Widget */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-[#6B4A6E] uppercase tracking-wider mb-4 border-b border-[#FCE7F3] pb-2">Calendar View</h3>
          {renderMiniCalendar()}
        </div>

        {/* Filters */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-[#6B4A6E] uppercase tracking-wider mb-4 border-b border-[#FCE7F3] pb-2">Filter Post Types</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(POST_TYPES).map(([key, obj]) => (
              <button 
                key={key}
                onClick={() => toggleFilter(key)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-opacity ${activeFilters.has(key) ? 'opacity-100' : 'opacity-40'}`}
                style={{ background: obj.bg, color: obj.color, border: `1px solid ${obj.color}30` }}
              >
                {obj.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h3 className="text-xs font-bold text-[#6B4A6E] uppercase tracking-wider mb-4 border-b border-[#FCE7F3] pb-2">Content Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6B4A6E]">Total Planned</span>
              <span className="font-bold text-[#1E1023]">{totalPosts}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6B4A6E]">Successfully Posted</span>
              <span className="font-bold text-[#15803d]">{postedCount}</span>
            </div>
            <div className="w-full bg-[#FCE7F3] h-2 rounded-full overflow-hidden mt-1">
              <div className="bg-[#BE185D] h-full transition-all" style={{ width: `${totalPosts ? (postedCount/totalPosts)*100 : 0}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Right Main Area ── */}
      <div className="flex-1 overflow-y-auto relative">
        {selectedDate ? renderDayDetail() : renderOverview()}

        {/* Floating Toast Notification */}
        <div className={`fixed bottom-6 right-6 bg-[#1E1023] text-white px-4 py-2 rounded-lg shadow-xl font-bold text-sm transition-all duration-300 pointer-events-none ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {toast}
        </div>
      </div>
      
    </div>
  );
}