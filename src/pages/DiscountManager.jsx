import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw, Zap, Tag } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const DISCOUNT_TYPES = [
    { value: 'percentage',    label: '% Off Cart / Category' },
    { value: 'fixed',         label: 'Fixed Amount Off (EGP)' },
    { value: 'free_shipping', label: 'Free Shipping' },
    { value: 'buyxgety',      label: 'Buy X Get Y (Quantity Deal)' },
];

const emptyForm = {
    code: '',
    type: 'percentage',
    value: '',
    appliesTo: 'entire',
    categories: [],
    minOrderValue: '',
    maxUses: '',
    expiresAt: '',
    status: 'active',
    isAutomatic: false,
    isStackable: false,
    stackCap: 30,
    buyQuantity: 2,
    getQuantity: 1,
    getDiscountPct: 100,
    buyxgetyCategory: '',
};

const DiscountManager = () => {
    const [discounts, setDiscounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);
    const [formData, setFormData] = useState(emptyForm);

    const todayStr = new Date().toISOString().substring(0, 10);

    const fetchDiscounts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/discounts`);
            if (res.ok) setDiscounts(await res.json());
        } catch { setMessage('Error loading discounts'); }
        finally { setIsLoading(false); }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data.sort((a, b) => a.sortOrder - b.sortOrder));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchDiscounts(); fetchCategories(); }, []);

    const resetForm = () => { setFormData(emptyForm); setEditingDiscount(null); setShowForm(false); };

    const toggleCategory = (name) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(name)
                ? prev.categories.filter(c => c !== name)
                : [...prev.categories, name]
        }));
    };

    const isExpired = (d) => d.expiresAt && new Date(d.expiresAt) < new Date();

    const formatValue = (d) => {
        if (d.type === 'free_shipping') return '🚚 Free Shipping';
        if (d.type === 'buyxgety') return `Buy ${d.buyQuantity} Get ${d.getQuantity} (${d.getDiscountPct}% off cheapest)`;
        if (d.type === 'percentage') return `${d.value}% off`;
        return `${d.value?.toFixed?.(2) || 0} EGP off`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.appliesTo === 'categories' && formData.categories.length === 0) {
            setMessage('Please select at least one category.'); return;
        }
        if (formData.type === 'buyxgety' && !formData.buyxgetyCategory) {
            setMessage('Please select the category this deal applies to.'); return;
        }
        if (!formData.isAutomatic && !formData.code.trim()) {
            setMessage('Please enter a discount code, or enable Auto-Apply.'); return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                code: formData.isAutomatic && !formData.code ? `AUTO_${Date.now()}` : formData.code.toUpperCase(),
                value: ['free_shipping', 'buyxgety'].includes(formData.type) ? 0 : parseFloat(formData.value) || 0,
                minOrderValue: parseFloat(formData.minOrderValue) || 0,
                maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
                expiresAt: formData.expiresAt || null,
                buyQuantity: parseInt(formData.buyQuantity) || 2,
                getQuantity: parseInt(formData.getQuantity) || 1,
                getDiscountPct: parseFloat(formData.getDiscountPct) || 100,
                stackCap: parseFloat(formData.stackCap) || 30,
            };
            const url = editingDiscount
                ? `${API_BASE_URL}/api/discounts/${editingDiscount._id}`
                : `${API_BASE_URL}/api/discounts`;
            const res = await fetch(url, {
                method: editingDiscount ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setMessage(editingDiscount ? '✅ Discount updated!' : '✅ Discount created!');
                resetForm(); await fetchDiscounts();
            } else {
                const err = await res.json();
                setMessage(err.message || 'Error saving discount');
            }
        } catch (err) {
            setMessage('Network error: ' + err.message);
        } finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this discount?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/discounts/${id}`, { method: 'DELETE' });
            setMessage('Deleted.'); await fetchDiscounts();
        } catch { setMessage('Error deleting'); }
    };

    const handleEdit = (d) => {
        setFormData({
            ...emptyForm, ...d,
            value: ['free_shipping','buyxgety'].includes(d.type) ? '' : d.value?.toString() || '',
            minOrderValue: d.minOrderValue?.toString() || '',
            maxUses: d.maxUses?.toString() || '',
            expiresAt: d.expiresAt ? d.expiresAt.substring(0, 10) : '',
            categories: d.categories || [],
            buyQuantity: d.buyQuantity || 2,
            getQuantity: d.getQuantity || 1,
            getDiscountPct: d.getDiscountPct || 100,
            stackCap: d.stackCap || 30,
            buyxgetyCategory: d.buyxgetyCategory || '',
        });
        setEditingDiscount(d); setShowForm(true);
    };

    const isBuyXGetY = formData.type === 'buyxgety';
    const needsCode = !formData.isAutomatic;

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Discount Management</h1>
                        <p className="text-sm text-gray-500 mt-1">Code-based, automatic, and quantity deals</p>
                    </div>
                    <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2"/> Add Discount
                    </button>
                </div>

                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${message.startsWith('Error') || message.startsWith('Please') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                        {message}
                    </div>
                )}

                {showForm && (
                    <div className="bg-gray-50 p-6 rounded-xl mb-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-5">{editingDiscount ? 'Edit Discount' : 'Create New Discount'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Type selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type *</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {DISCOUNT_TYPES.map(dt => (
                                        <label key={dt.value} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer text-center text-sm font-medium transition ${formData.type === dt.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'}`}>
                                            <input type="radio" name="type" value={dt.value} checked={formData.type === dt.value} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className="hidden"/>
                                            {dt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Auto-apply toggle */}
                            <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <input type="checkbox" id="isAutomatic" checked={formData.isAutomatic} onChange={e => setFormData(p => ({ ...p, isAutomatic: e.target.checked }))} className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                                <div>
                                    <label htmlFor="isAutomatic" className="text-sm font-semibold text-purple-800 cursor-pointer flex items-center gap-1">
                                        <Zap size={14}/> Apply Automatically in Cart (no code needed)
                                    </label>
                                    <p className="text-xs text-purple-600 mt-1">Customer sees discount applied without entering a code. Perfect for sitewide sales or seasonal promos.</p>
                                </div>
                            </div>

                            {/* Code + Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Discount Code {needsCode && <span className="text-red-500">*</span>}
                                        {!needsCode && <span className="text-gray-400 font-normal ml-1 text-xs">optional for auto</span>}
                                    </label>
                                    <input type="text" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))} required={needsCode} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" placeholder={formData.isAutomatic ? 'Optional' : 'e.g. SUMMER20'}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Value */}
                            {!['free_shipping', 'buyxgety'].includes(formData.type) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (EGP)'} *</label>
                                    <input type="number" value={formData.value} onChange={e => setFormData(p => ({ ...p, value: e.target.value }))} required className="block w-full md:w-1/2 rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" placeholder={formData.type === 'percentage' ? 'e.g. 20' : 'e.g. 100'} min="0" max={formData.type === 'percentage' ? '100' : undefined} step={formData.type === 'percentage' ? '1' : '0.01'}/>
                                </div>
                            )}

                            {/* Buy X Get Y */}
                            {isBuyXGetY && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-4">
                                    <h3 className="text-sm font-semibold text-orange-800">Quantity Deal Settings</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Customer Must Buy</label>
                                            <select value={formData.buyQuantity} onChange={e => setFormData(p => ({ ...p, buyQuantity: e.target.value }))} className="block w-full rounded-lg border-gray-300 p-3 border focus:border-indigo-500">
                                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} item{n>1?'s':''}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">To Get (# discounted)</label>
                                            <select value={formData.getQuantity} onChange={e => setFormData(p => ({ ...p, getQuantity: e.target.value }))} className="block w-full rounded-lg border-gray-300 p-3 border focus:border-indigo-500">
                                                {[1,2,3].map(n => <option key={n} value={n}>{n} item{n>1?'s':''}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Discount on Cheapest</label>
                                            <select value={formData.getDiscountPct} onChange={e => setFormData(p => ({ ...p, getDiscountPct: e.target.value }))} className="block w-full rounded-lg border-gray-300 p-3 border focus:border-indigo-500">
                                                <option value="100">100% — FREE</option>
                                                <option value="50">50% off</option>
                                                <option value="30">30% off</option>
                                                <option value="25">25% off</option>
                                                <option value="20">20% off</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-orange-100 text-sm text-orange-800 font-medium">
                                        Preview: Buy {formData.buyQuantity} → cheapest {formData.getQuantity} get {formData.getDiscountPct}% off
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Applies to Category *</label>
                                        <select value={formData.buyxgetyCategory} onChange={e => setFormData(p => ({ ...p, buyxgetyCategory: e.target.value }))} className="block w-full rounded-lg border-gray-300 p-3 border focus:border-indigo-500" required={isBuyXGetY}>
                                            <option value="">Select category</option>
                                            <option value="all">All Categories</option>
                                            {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Applies To */}
                            {['percentage','fixed'].includes(formData.type) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Applies To *</label>
                                    <div className="flex gap-4 mb-3">
                                        {['entire','categories'].map(opt => (
                                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="appliesTo" value={opt} checked={formData.appliesTo===opt} onChange={e => setFormData(p => ({ ...p, appliesTo: e.target.value, categories: [] }))} className="text-indigo-600"/>
                                                <span className="text-sm text-gray-700">{opt==='entire' ? '🛒 Entire Cart' : '🏷️ Specific Categories'}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {formData.appliesTo==='categories' && (
                                        <div className="p-4 bg-white border border-indigo-100 rounded-lg">
                                            <div className="flex flex-wrap gap-2">
                                                {categories.map(cat => (
                                                    <button key={cat._id} type="button" onClick={() => toggleCategory(cat.name)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${formData.categories.includes(cat.name) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                                                        {formData.categories.includes(cat.name) ? '✓ ':''}{cat.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stacking */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <input type="checkbox" id="isStackable" checked={formData.isStackable} onChange={e => setFormData(p => ({ ...p, isStackable: e.target.checked }))} className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                                    <div>
                                        <label htmlFor="isStackable" className="text-sm font-semibold text-blue-800 cursor-pointer">Allow stacking with other discounts</label>
                                        <p className="text-xs text-blue-600 mt-1">If enabled, loyal customer codes can stack on top (applied sequentially). If combined total exceeds the cap, only the higher discount applies.</p>
                                    </div>
                                </div>
                                {formData.isStackable && (
                                    <div className="ml-7 flex items-center gap-3">
                                        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Stacking Cap (%)</label>
                                        <input type="number" value={formData.stackCap} onChange={e => setFormData(p => ({ ...p, stackCap: e.target.value }))} className="w-24 rounded-lg border-gray-300 shadow-sm p-2 border focus:border-indigo-500 text-sm" min="1" max="100"/>
                                        <p className="text-xs text-gray-500">If combined % exceeds this, only the higher discount applies</p>
                                    </div>
                                )}
                            </div>

                            {/* Limits */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Order (EGP) <span className="text-gray-400 text-xs">optional</span></label>
                                    <input type="number" value={formData.minOrderValue} onChange={e => setFormData(p => ({ ...p, minOrderValue: e.target.value }))} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" placeholder="e.g. 500" min="0"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses <span className="text-gray-400 text-xs">optional</span></label>
                                    <input type="number" value={formData.maxUses} onChange={e => setFormData(p => ({ ...p, maxUses: e.target.value }))} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" placeholder="e.g. 100" min="1"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date <span className="text-gray-400 text-xs">optional</span></label>
                                    <input type="date" value={formData.expiresAt} onChange={e => setFormData(p => ({ ...p, expiresAt: e.target.value }))} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" min={todayStr}/>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2 border-t">
                                <button type="submit" disabled={isSubmitting} className="flex items-center px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                                    <Save className="w-4 h-4 mr-2"/> {editingDiscount ? 'Update' : 'Create'} Discount
                                </button>
                                <button type="button" onClick={resetForm} className="flex items-center px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                    <X className="w-4 h-4 mr-2"/> Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Table */}
                {isLoading ? (
                    <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600"/></div>
                ) : discounts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No discounts yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Type / Value</th>
                                    <th className="px-4 py-3">Scope</th>
                                    <th className="px-4 py-3">Trigger</th>
                                    <th className="px-4 py-3">Stackable</th>
                                    <th className="px-4 py-3">Uses</th>
                                    <th className="px-4 py-3">Expiry</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map(d => (
                                    <tr key={d._id} className={`bg-white border-b hover:bg-gray-50 ${isExpired(d) ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3 font-mono font-bold text-gray-900 text-xs">{d.code}</td>
                                        <td className="px-4 py-3 text-indigo-700 font-medium text-xs">{formatValue(d)}</td>
                                        <td className="px-4 py-3 text-xs">
                                            {d.type==='buyxgety' ? <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{d.buyxgetyCategory||'All'}</span>
                                            : d.appliesTo==='categories' && d.categories?.length > 0 ? <span title={d.categories.join(', ')} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{d.categories.length} cat.</span>
                                            : <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Entire</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {d.isAutomatic ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">⚡ Auto</span> : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">🏷️ Code</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs">{d.isStackable ? <span className="text-green-600">✅ (cap {d.stackCap}%)</span> : <span className="text-gray-400">No</span>}</td>
                                        <td className="px-4 py-3 text-xs">{d.usedCount||0}{d.maxUses ? `/${d.maxUses}` : '/∞'}</td>
                                        <td className="px-4 py-3 text-xs">{d.expiresAt ? <span className={isExpired(d)?'text-red-600 font-semibold':'text-gray-600'}>{new Date(d.expiresAt).toLocaleDateString()}{isExpired(d)?' (exp)':''}</span> : <span className="text-gray-400">—</span>}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status==='active'&&!isExpired(d)?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{isExpired(d)?'expired':d.status}</span></td>
                                        <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                            <button onClick={() => handleEdit(d)} className="text-indigo-600 hover:text-indigo-900 p-1"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(d._id)} className="text-red-600 hover:text-red-900 p-1"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            
        </div>
    );
};

export default DiscountManager;