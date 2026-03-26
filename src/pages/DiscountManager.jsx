import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const DiscountManager = () => {
    const [discounts, setDiscounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);

    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage',        // 'percentage' | 'fixed' | 'free_shipping'
        value: '',
        appliesTo: 'entire',       // 'entire' | 'categories'
        categories: [],
        minOrderValue: '',         // minimum cart total to unlock
        maxUses: '',               // total usage limit (blank = unlimited)
        expiresAt: '',             // expiry date (blank = no expiry)
        status: 'active'
    });

    // ─── Fetch Data ───────────────────────────────────────────────────────────

    const fetchDiscounts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/discounts`);
            if (response.ok) {
                setDiscounts(await response.json());
            } else throw new Error('Failed to fetch discounts');
        } catch (error) {
            setMessage('Error loading discounts');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories`);
            if (response.ok) setCategories(await response.json());
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        fetchDiscounts();
        fetchCategories();
    }, []);

    // ─── Form Helpers ─────────────────────────────────────────────────────────

    const resetForm = () => {
        setFormData({
            code: '', type: 'percentage', value: '',
            appliesTo: 'entire', categories: [],
            minOrderValue: '', maxUses: '', expiresAt: '', status: 'active'
        });
        setEditingDiscount(null);
        setShowForm(false);
    };

    const toggleCategory = (catName) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(catName)
                ? prev.categories.filter(c => c !== catName)
                : [...prev.categories, catName]
        }));
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.appliesTo === 'categories' && formData.categories.length === 0) {
            setMessage('Please select at least one category.');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                value: formData.type === 'free_shipping' ? 0 : parseFloat(formData.value) || 0,
                minOrderValue: parseFloat(formData.minOrderValue) || 0,
                maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
                expiresAt: formData.expiresAt || null,
            };

            const url = editingDiscount
                ? `${API_BASE_URL}/api/discounts/${editingDiscount._id}`
                : `${API_BASE_URL}/api/discounts`;

            const response = await fetch(url, {
                method: editingDiscount ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setMessage(editingDiscount ? 'Discount updated!' : 'Discount created!');
                resetForm();
                await fetchDiscounts();
            } else {
                const err = await response.json();
                setMessage(err.message || 'Error saving discount');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Delete ───────────────────────────────────────────────────────────────

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this discount?')) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/discounts/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setMessage('Discount deleted');
                await fetchDiscounts();
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Edit ─────────────────────────────────────────────────────────────────

    const handleEdit = (discount) => {
        setFormData({
            code: discount.code,
            type: discount.type,
            value: discount.type === 'free_shipping' ? '' : discount.value?.toString() || '',
            appliesTo: discount.appliesTo || 'entire',
            categories: discount.categories || [],
            minOrderValue: discount.minOrderValue?.toString() || '',
            maxUses: discount.maxUses?.toString() || '',
            expiresAt: discount.expiresAt ? discount.expiresAt.substring(0, 10) : '',
            status: discount.status
        });
        setEditingDiscount(discount);
        setShowForm(true);
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const formatValue = (discount) => {
        if (discount.type === 'free_shipping') return 'Free Shipping';
        if (discount.type === 'percentage') return `${discount.value}%`;
        return `${discount.value?.toFixed(2)} EGP`;
    };

    const isExpired = (d) => d.expiresAt && new Date(d.expiresAt) < new Date();

    const todayStr = new Date().toISOString().substring(0, 10);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Discount Management</h1>
                        <p className="text-sm text-gray-500 mt-1">Create codes with category targeting, expiry dates, and usage limits</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Discount
                    </button>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${
                        message.startsWith('Error') || message.startsWith('Please')
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : 'bg-green-50 text-green-700 border-green-300'
                    }`}>
                        {message}
                    </div>
                )}

                {/* ── FORM ─────────────────────────────────────────────────── */}
                {showForm && (
                    <div className="bg-gray-50 p-6 rounded-xl mb-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-5">
                            {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* Row 1: Code + Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code *</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500 focus:ring-indigo-500"
                                        placeholder="SUMMER20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Type + Value */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value, value: '' })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"
                                    >
                                        <option value="percentage">Percentage off (%)</option>
                                        <option value="fixed">Fixed amount off (EGP)</option>
                                        <option value="free_shipping">Free Shipping</option>
                                    </select>
                                </div>
                                {formData.type !== 'free_shipping' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (EGP)'} *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.value}
                                            onChange={e => setFormData({ ...formData, value: e.target.value })}
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"
                                            placeholder={formData.type === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
                                            min="0"
                                            max={formData.type === 'percentage' ? '100' : undefined}
                                            step={formData.type === 'percentage' ? '1' : '0.01'}
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Row 3: Applies To */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Applies To *</label>
                                <div className="flex gap-4">
                                    {['entire', 'categories'].map(opt => (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="appliesTo"
                                                value={opt}
                                                checked={formData.appliesTo === opt}
                                                onChange={e => setFormData({ ...formData, appliesTo: e.target.value, categories: [] })}
                                                className="text-indigo-600"
                                            />
                                            <span className="text-sm text-gray-700 capitalize">
                                                {opt === 'entire' ? '🛒 Entire Cart' : '🏷️ Specific Categories'}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                {/* Category Selector */}
                                {formData.appliesTo === 'categories' && (
                                    <div className="mt-3 p-4 bg-white border border-indigo-100 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-3">Select which categories this discount applies to:</p>
                                        {categories.length === 0 ? (
                                            <p className="text-sm text-gray-400">No categories found. Add categories first.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {categories.map(cat => (
                                                    <button
                                                        key={cat._id}
                                                        type="button"
                                                        onClick={() => toggleCategory(cat.name)}
                                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                                            formData.categories.includes(cat.name)
                                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                                                        }`}
                                                    >
                                                        {formData.categories.includes(cat.name) ? '✓ ' : ''}{cat.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {formData.categories.length > 0 && (
                                            <p className="text-xs text-indigo-600 mt-2 font-medium">
                                                Selected: {formData.categories.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Row 4: Min Order + Max Uses + Expiry */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Min. Order Value (EGP)
                                        <span className="text-gray-400 font-normal ml-1">— optional</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minOrderValue}
                                        onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"
                                        placeholder="e.g. 500"
                                        min="0"
                                        step="1"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Leave blank for no minimum</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Uses (Total)
                                        <span className="text-gray-400 font-normal ml-1">— optional</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxUses}
                                        onChange={e => setFormData({ ...formData, maxUses: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"
                                        placeholder="e.g. 100"
                                        min="1"
                                        step="1"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Leave blank for unlimited</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiry Date
                                        <span className="text-gray-400 font-normal ml-1">— optional</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expiresAt}
                                        onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"
                                        min={todayStr}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Leave blank for no expiry</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingDiscount ? 'Update Discount' : 'Create Discount'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex items-center px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── TABLE ────────────────────────────────────────────────── */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : discounts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No discounts yet. Create your first one!</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Value</th>
                                    <th className="px-4 py-3">Applies To</th>
                                    <th className="px-4 py-3">Min Order</th>
                                    <th className="px-4 py-3">Uses</th>
                                    <th className="px-4 py-3">Expiry</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map(discount => (
                                    <tr key={discount._id} className={`bg-white border-b hover:bg-gray-50 ${isExpired(discount) ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3 font-mono font-bold text-gray-900">{discount.code}</td>
                                        <td className="px-4 py-3 font-medium text-indigo-700">{formatValue(discount)}</td>
                                        <td className="px-4 py-3">
                                            {discount.appliesTo === 'categories' && discount.categories?.length > 0
                                                ? <span title={discount.categories.join(', ')} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                    {discount.categories.length} categor{discount.categories.length > 1 ? 'ies' : 'y'}
                                                  </span>
                                                : <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Entire Cart</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            {discount.minOrderValue > 0 ? `${discount.minOrderValue} EGP` : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {discount.usedCount || 0}
                                            {discount.maxUses ? ` / ${discount.maxUses}` : ' / ∞'}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {discount.expiresAt
                                                ? <span className={isExpired(discount) ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                                    {new Date(discount.expiresAt).toLocaleDateString()}
                                                    {isExpired(discount) && ' (expired)'}
                                                  </span>
                                                : <span className="text-gray-400">No expiry</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                discount.status === 'active' && !isExpired(discount)
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {isExpired(discount) ? 'expired' : discount.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                            <button onClick={() => handleEdit(discount)} className="text-indigo-600 hover:text-indigo-900 p-1" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(discount._id)} className="text-red-600 hover:text-red-900 p-1" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── CHEAT SHEET ──────────────────────────────────────────────── */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h4 className="font-semibold text-amber-800 mb-3">💡 Discount Recipe Ideas for Siraj Candles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-amber-700">
                    <div><strong>CANDLES20</strong> — 20% off, Candles category only</div>
                    <div><strong>FREESHIP</strong> — Free shipping, min order 3000 EGP</div>
                    <div><strong>WELCOME10</strong> — 10% off entire cart, 1 use per campaign</div>
                    <div><strong>EID50</strong> — 50 EGP off, expires after holiday</div>
                    <div><strong>BUNDLE15</strong> — 15% off, Bundles category only</div>
                    <div><strong>SOAP30</strong> — 30% off, Soap + Body Splash categories</div>
                </div>
            </div>
        </div>
    );
};

export default DiscountManager;
