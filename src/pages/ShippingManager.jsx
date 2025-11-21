import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const ShippingManager = () => {
    const [shippingRates, setShippingRates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [editingRate, setEditingRate] = useState(null);
    const [newRate, setNewRate] = useState({ city: '', shippingFee: '' });

    const fetchShippingRates = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/shipping`);
            if (response.ok) {
                const data = await response.json();
                setShippingRates(data);
            } else {
                throw new Error('Failed to fetch shipping rates');
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('Error loading shipping rates');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShippingRates();
    }, []);

    const handleAddRate = async (e) => {
        e.preventDefault();
        if (!newRate.city.trim() || !newRate.shippingFee) {
            setMessage('Please fill in both city and shipping fee');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/shipping-rates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: newRate.city.trim(),
                    shippingFee: parseFloat(newRate.shippingFee)
                })
            });

            if (response.ok) {
                setMessage('Shipping rate added successfully');
                setNewRate({ city: '', shippingFee: '' });
                await fetchShippingRates();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error adding shipping rate');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRate = async (id, updates) => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/shipping-rates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                setMessage('Shipping rate updated successfully');
                setEditingRate(null);
                await fetchShippingRates();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error updating shipping rate');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRate = async (id) => {
        if (!window.confirm('Are you sure you want to delete this shipping rate?')) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/shipping-rates/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessage('Shipping rate deleted successfully');
                await fetchShippingRates();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error deleting shipping rate');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Shipping Management</h1>
                
                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${
                        message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Add New Shipping Rate Form */}
                <form onSubmit={handleAddRate} className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Shipping Rate</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                value={newRate.city}
                                onChange={(e) => setNewRate({ ...newRate, city: e.target.value })}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                placeholder="Enter city name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Fee (EGP)</label>
                            <input
                                type="number"
                                value={newRate.shippingFee}
                                onChange={(e) => setNewRate({ ...newRate, shippingFee: e.target.value })}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Rate
                            </button>
                        </div>
                    </div>
                </form>

                {/* Shipping Rates Table */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : shippingRates.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No shipping rates configured yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">City</th>
                                    <th className="px-4 py-3">Shipping Fee (EGP)</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shippingRates.map((rate) => (
                                    <tr key={rate._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {editingRate === rate._id ? (
                                                <input
                                                    type="text"
                                                    defaultValue={rate.city}
                                                    onBlur={(e) => handleUpdateRate(rate._id, { city: e.target.value })}
                                                    className="w-full p-2 border rounded"
                                                />
                                            ) : (
                                                rate.city
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingRate === rate._id ? (
                                                <input
                                                    type="number"
                                                    defaultValue={rate.shippingFee}
                                                    onBlur={(e) => handleUpdateRate(rate._id, { shippingFee: parseFloat(e.target.value) })}
                                                    className="w-full p-2 border rounded"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            ) : (
                                                rate.shippingFee.toFixed(2)
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                            {editingRate === rate._id ? (
                                                <button
                                                    onClick={() => setEditingRate(null)}
                                                    className="text-gray-500 hover:text-gray-700 p-1"
                                                >
                                                    <X size={16} />
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditingRate(rate._id)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRate(rate._id)}
                                                        className="text-red-600 hover:text-red-900 p-1"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
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

export default ShippingManager;