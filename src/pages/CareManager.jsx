import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const CareManager = () => {
    const [careInstructions, setCareInstructions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingCare, setEditingCare] = useState(null);
    
    const [formData, setFormData] = useState({
        category: '',
        careTitle: '',
        careContent: ''
    });

    const fetchCareInstructions = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/care`);
            if (response.ok) {
                const data = await response.json();
                setCareInstructions(data);
            } else {
                throw new Error('Failed to fetch care instructions');
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('Error loading care instructions');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories`);
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        Promise.all([fetchCareInstructions(), fetchCategories()]);
    }, []);

    const resetForm = () => {
        setFormData({
            category: '',
            careTitle: '',
            careContent: ''
        });
        setEditingCare(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.category || !formData.careTitle || !formData.careContent) {
            setMessage('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);

        try {
          
const url = editingCare 
    ? `${API_BASE_URL}/api/care/${editingCare._id}`
    : `${API_BASE_URL}/api/care`;
            
            const method = editingCare ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setMessage(editingCare ? 'Care instructions updated successfully' : 'Care instructions created successfully');
                resetForm();
                await fetchCareInstructions();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error saving care instructions');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete these care instructions?')) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/care/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessage('Care instructions deleted successfully');
                await fetchCareInstructions();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error deleting care instructions');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (care) => {
        setFormData({
            category: care.category,
            careTitle: care.careTitle,
            careContent: care.careContent
        });
        setEditingCare(care);
        setShowForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Product Care Instructions</h1>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Care Instructions
                    </button>
                </div>
                
                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${
                        message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Care Instructions Form */}
                {showForm && (
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            {editingCare ? 'Edit Care Instructions' : 'Add New Care Instructions'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                    required
                                >
                                    <option value="">Select a category</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Care Title</label>
                                <input
                                    type="text"
                                    value={formData.careTitle}
                                    onChange={(e) => setFormData({ ...formData, careTitle: e.target.value })}
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                    placeholder="e.g., Candle Care, Usage Instructions"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Care Content</label>
                                <textarea
                                    value={formData.careContent}
                                    onChange={(e) => setFormData({ ...formData, careContent: e.target.value })}
                                    rows="6"
                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                    placeholder="Enter detailed care instructions..."
                                    required
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingCare ? 'Update Instructions' : 'Create Instructions'}
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

                {/* Care Instructions Table */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : careInstructions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No care instructions created yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Title</th>
                                    <th className="px-4 py-3">Content Preview</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {careInstructions.map((care) => (
                                    <tr key={care._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{care.category}</td>
                                        <td className="px-4 py-3">{care.careTitle}</td>
                                        <td className="px-4 py-3">
                                            <div className="max-w-xs truncate" title={care.careContent}>
                                                {care.careContent}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                            <button
                                                onClick={() => handleEdit(care)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(care._id)}
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

export default CareManager;