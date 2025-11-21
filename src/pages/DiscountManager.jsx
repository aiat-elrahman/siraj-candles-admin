import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const DiscountManager = () => {
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);
    
    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage',
        value: '',
        appliesTo: 'entire',
        categories: [],
        products: [],
        status: 'active'
    });

    const fetchDiscounts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/discounts`);
            if (response.ok) {
                const data = await response.json();
                setDiscounts(data);
            } else {
                throw new Error('Failed to fetch discounts');
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('Error loading discounts');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const resetForm = () => {
        setFormData({
            code: '',
            type: 'percentage',
            value: '',
            appliesTo: 'entire',
            categories: [],
            products: [],
            status: 'active'
        });
        setEditingDiscount(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const discountData = {
                ...formData,
                value: parseFloat(formData.value)
            };

            const url = editingDiscount 
                ? `${API_BASE_URL}/api/discounts/${editingDiscount._id}`
                : `${API_BASE_URL}/api/discounts`;
            
            const method = editingDiscount ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discountData)
            });

            if (response.ok) {
                setMessage(editingDiscount ? 'Discount updated successfully' : 'Discount created successfully');
                resetForm();
                await fetchDiscounts();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error saving discount');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this discount?')) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/discounts/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessage('Discount deleted successfully');
                await fetchDiscounts();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error deleting discount');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (discount) => {
        setFormData({
            code: discount.code,
            type: discount.type,
            value: discount.value.toString(),
            appliesTo: discount.appliesTo,
            categories: discount.categories || [],
            products: discount.products || [],
            status: discount.status
        });
        setEditingDiscount(discount);
        setShowForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Discount Management</h1>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Discount
                    </button>
                </div>
                
                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${
                        message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Discount Form */}
                {showForm && (
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                        placeholder="SUMMER20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (EGP)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {formData.type === 'percentage' ? 'Percentage Value' : 'Fixed Amount (EGP)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                        placeholder={formData.type === 'percentage' ? '20' : '50'}
                                        min="0"
                                        step={formData.type === 'percentage' ? '1' : '0.01'}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingDiscount ? 'Update Discount' : 'Create Discount'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Discounts Table */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : discounts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No discounts created yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Value</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map((discount) => (
                                    <tr key={discount._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{discount.code}</td>
                                        <td className="px-4 py-3 capitalize">{discount.type}</td>
                                        <td className="px-4 py-3">
                                            {discount.type === 'percentage' ? `${discount.value}%` : `${discount.value.toFixed(2)} EGP`}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                discount.status === 'active' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {discount.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                            <button
                                                onClick={() => handleEdit(discount)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(discount._id)}
                                                className="text-red-600 hover:text-red-900 p-1"
                                                title="Delete"
                                            >
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
        </div>
    );
};

export default DiscountManager;