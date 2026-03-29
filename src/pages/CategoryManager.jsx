import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Image } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingSubImage, setUploadingSubImage] = useState(null); // index of subcategory being uploaded
    const [expandedCategory, setExpandedCategory] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        image: '',
        sortOrder: 0,
        subcategories: [],
    });

    const [newSubName, setNewSubName] = useState('');

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/categories`);
            if (res.ok) setCategories((await res.json()).sort((a, b) => a.sortOrder - b.sortOrder));
            else throw new Error('Failed');
        } catch { setMessage('Error loading categories'); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchCategories(); }, []);

    // ── Form helpers ──────────────────────────────────────────────────────────
    const resetForm = () => {
        setFormData({ name: '', image: '', sortOrder: categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) + 1 : 0, subcategories: [] });
        setNewSubName('');
        setEditingCategory(null);
        setShowForm(false);
    };

    // ── Category image upload ─────────────────────────────────────────────────
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingImage(true);
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            setFormData(prev => ({ ...prev, image: data.imageUrl }));
        } catch { setMessage('Error uploading image'); }
        finally { setUploadingImage(false); }
    };

    // ── Subcategory helpers ───────────────────────────────────────────────────
    const addSubcategory = () => {
        const name = newSubName.trim();
        if (!name) return;
        if (formData.subcategories.find(s => s.name === name)) { setMessage('Subcategory already exists'); return; }
        setFormData(prev => ({ ...prev, subcategories: [...prev.subcategories, { name, image: '' }] }));
        setNewSubName('');
    };

    const removeSubcategory = (index) => {
        setFormData(prev => ({ ...prev, subcategories: prev.subcategories.filter((_, i) => i !== index) }));
    };

    const updateSubName = (index, name) => {
        setFormData(prev => {
            const subs = [...prev.subcategories];
            subs[index] = { ...subs[index], name };
            return { ...prev, subcategories: subs };
        });
    };

    // ── Subcategory image upload ──────────────────────────────────────────────
    const handleSubImageUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingSubImage(index);
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            setFormData(prev => {
                const subs = [...prev.subcategories];
                subs[index] = { ...subs[index], image: data.imageUrl };
                return { ...prev, subcategories: subs };
            });
        } catch { setMessage('Error uploading subcategory image'); }
        finally { setUploadingSubImage(null); }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) { setMessage('Please enter a category name'); return; }
        setIsSubmitting(true);
        try {
            const url = editingCategory
                ? `${API_BASE_URL}/api/categories/${editingCategory._id}`
                : `${API_BASE_URL}/api/categories`;
            const res = await fetch(url, {
                method: editingCategory ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setMessage(editingCategory ? '✅ Category updated!' : '✅ Category created!');
                resetForm();
                await fetchCategories();
                setTimeout(() => setMessage(''), 3000);
            } else {
                const err = await res.json();
                setMessage(err.message || 'Error saving');
            }
        } catch (err) { setMessage('Network error: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this category?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/categories/${id}`, { method: 'DELETE' });
            setMessage('Deleted'); await fetchCategories();
        } catch { setMessage('Error deleting'); }
    };

    const handleEdit = (cat) => {
        setFormData({
            name: cat.name,
            image: cat.image || '',
            sortOrder: cat.sortOrder,
            // Handle both old string format and new object format
            subcategories: (cat.subcategories || []).map(s =>
                typeof s === 'string' ? { name: s, image: '' } : s
            ),
        });
        setEditingCategory(cat);
        setShowForm(true);
        setNewSubName('');
    };

    const handleMove = async (categoryId, direction) => {
        const currentIndex = categories.findIndex(c => c._id === categoryId);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;
        const cat1 = categories[currentIndex];
        const cat2 = categories[newIndex];
        await Promise.all([
            fetch(`${API_BASE_URL}/api/categories/${cat1._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cat1, sortOrder: cat2.sortOrder }) }),
            fetch(`${API_BASE_URL}/api/categories/${cat2._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cat2, sortOrder: cat1.sortOrder }) })
        ]);
        await fetchCategories();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Category Management</h1>
                        <p className="text-sm text-gray-500 mt-1">Add subcategories with their own images for the cascaded menu</p>
                    </div>
                    <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2"/> Add Category
                    </button>
                </div>

                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                        {message}
                    </div>
                )}

                {/* ── FORM ── */}
                {showForm && (
                    <div className="bg-gray-50 p-6 rounded-xl mb-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-5">
                            {editingCategory ? `Edit: ${editingCategory.name}` : 'Create New Category'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Name + Sort */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" placeholder="e.g. Candles" required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                    <input type="number" value={formData.sortOrder} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" min="0"/>
                                    <p className="text-xs text-gray-500 mt-1">Lower = appears first</p>
                                </div>
                            </div>

                            {/* Category image */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
                                <div className="flex items-center gap-3">
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="cat-img"/>
                                    <label htmlFor="cat-img" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer border">
                                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                                    </label>
                                    {formData.image && <button type="button" onClick={() => setFormData({ ...formData, image: '' })} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">Remove</button>}
                                </div>
                                {formData.image && <img src={formData.image} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg border"/>}
                            </div>

                            {/* ── Subcategories ── */}
                            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                                <label className="block text-sm font-semibold text-indigo-800 mb-1">
                                    Subcategories <span className="font-normal text-indigo-600 text-xs">— each gets its own image and page</span>
                                </label>
                                <p className="text-xs text-indigo-600 mb-3">Example: Under "Candles" add "Scented Candles", "Decorative Candles"</p>

                                {/* Add input */}
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={newSubName}
                                        onChange={e => setNewSubName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubcategory(); } }}
                                        className="flex-1 rounded-lg border-gray-300 shadow-sm p-2 border focus:border-indigo-500 text-sm"
                                        placeholder="Subcategory name, then press Enter or Add"
                                    />
                                    <button type="button" onClick={addSubcategory} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                                        + Add
                                    </button>
                                </div>

                                {/* Subcategory list with image upload per subcategory */}
                                {formData.subcategories.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No subcategories — clicking this category will go directly to its products</p>
                                ) : (
                                    <div className="space-y-3">
                                        {formData.subcategories.map((sub, index) => (
                                            <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-indigo-100">
                                                {/* Sub image */}
                                                <div className="flex-shrink-0">
                                                    {sub.image ? (
                                                        <div className="relative">
                                                            <img src={sub.image} alt={sub.name} className="w-12 h-12 object-cover rounded-lg border"/>
                                                            <button type="button" onClick={() => {
                                                                const subs = [...formData.subcategories];
                                                                subs[index] = { ...subs[index], image: '' };
                                                                setFormData(prev => ({ ...prev, subcategories: subs }));
                                                            }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
                                                        </div>
                                                    ) : (
                                                        <label className="w-12 h-12 bg-gray-100 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-gray-400">
                                                            <Image size={14}/>
                                                            <span className="text-xs mt-0.5">Add</span>
                                                            <input type="file" accept="image/*" className="hidden" onChange={e => handleSubImageUpload(e, index)}/>
                                                            {uploadingSubImage === index && <span className="text-xs">...</span>}
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Sub name editable */}
                                                <input
                                                    type="text"
                                                    value={sub.name}
                                                    onChange={e => updateSubName(index, e.target.value)}
                                                    className="flex-1 rounded-md border-gray-300 p-2 border text-sm focus:border-indigo-500"
                                                />

                                                <button type="button" onClick={() => removeSubcategory(index)} className="text-red-400 hover:text-red-600 p-1">
                                                    <X size={16}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={isSubmitting} className="flex items-center px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    <Save className="w-4 h-4 mr-2"/> {editingCategory ? 'Update' : 'Create'} Category
                                </button>
                                <button type="button" onClick={resetForm} className="flex items-center px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                    <X className="w-4 h-4 mr-2"/> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── TABLE ── */}
                {isLoading ? (
                    <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600"/></div>
                ) : categories.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No categories yet.</p>
                ) : (
                    <div className="space-y-2">
                        {categories.map((category, index) => (
                            <div key={category._id} className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50">
                                    {/* Order controls */}
                                    <div className="flex flex-col gap-0.5 items-center">
                                        <button onClick={() => handleMove(category._id, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUp size={14}/></button>
                                        <span className="text-xs text-gray-400">{index + 1}</span>
                                        <button onClick={() => handleMove(category._id, 'down')} disabled={index === categories.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDown size={14}/></button>
                                    </div>

                                    {/* Image */}
                                    {category.image
                                        ? <img src={category.image} alt={category.name} className="w-12 h-12 object-cover rounded-lg border"/>
                                        : <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">No img</div>
                                    }

                                    {/* Name + subcategory summary */}
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{category.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {category.subcategories?.length > 0
                                                ? `${category.subcategories.length} subcategor${category.subcategories.length > 1 ? 'ies' : 'y'}`
                                                : 'No subcategories — direct link to products'
                                            }
                                        </p>
                                    </div>

                                    {/* Expand */}
                                    {category.subcategories?.length > 0 && (
                                        <button onClick={() => setExpandedCategory(expandedCategory === category._id ? null : category._id)} className="text-gray-400 hover:text-indigo-600 p-1">
                                            {expandedCategory === category._id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                        </button>
                                    )}

                                    <button onClick={() => handleEdit(category)} className="text-indigo-600 hover:text-indigo-900 p-1"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(category._id)} className="text-red-600 hover:text-red-900 p-1"><Trash2 size={16}/></button>
                                </div>

                                {/* Expanded subcategories preview */}
                                {expandedCategory === category._id && category.subcategories?.length > 0 && (
                                    <div className="px-6 pb-4 pt-2 bg-indigo-50 border-t border-indigo-100">
                                        <p className="text-xs font-semibold text-indigo-700 mb-2">Subcategories:</p>
                                        <div className="flex flex-wrap gap-3">
                                            {category.subcategories.map((sub, i) => {
                                                const subName = typeof sub === 'string' ? sub : sub.name;
                                                const subImg = typeof sub === 'string' ? '' : sub.image;
                                                return (
                                                    <div key={i} className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-3 py-2">
                                                        {subImg && <img src={subImg} alt={subName} className="w-8 h-8 object-cover rounded"/>}
                                                        <span className="text-sm text-indigo-700 font-medium">{subName}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryManager;