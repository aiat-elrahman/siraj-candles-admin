import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        sortOrder: 0
    });

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories`);
            if (response.ok) {
                const data = await response.json();
                // Sort by sortOrder
                const sortedCategories = data.sort((a, b) => a.sortOrder - b.sortOrder);
                setCategories(sortedCategories);
            } else {
                throw new Error('Failed to fetch categories');
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('Error loading categories');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            sortOrder: categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) + 1 : 0
        });
        setEditingCategory(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setMessage('Please enter a category name');
            return;
        }

        setIsSubmitting(true);

        try {
            const url = editingCategory 
                ? `${API_BASE_URL}/api/categories/${editingCategory._id}`
                : `${API_BASE_URL}/api/categories`;
            
            const method = editingCategory ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setMessage(editingCategory ? 'Category updated successfully' : 'Category created successfully');
                resetForm();
                await fetchCategories();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error saving category');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessage('Category deleted successfully');
                await fetchCategories();
            } else {
                const error = await response.json();
                setMessage(error.message || 'Error deleting category');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (category) => {
        setFormData({
            name: category.name,
            sortOrder: category.sortOrder
        });
        setEditingCategory(category);
        setShowForm(true);
    };

    const handleMove = async (categoryId, direction) => {
        const category = categories.find(c => c._id === categoryId);
        if (!category) return;

        const currentIndex = categories.findIndex(c => c._id === categoryId);
        let newIndex;

        if (direction === 'up' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < categories.length - 1) {
            newIndex = currentIndex + 1;
        } else {
            return;
        }

        // Swap sort orders
        const newCategories = [...categories];
        const tempOrder = newCategories[currentIndex].sortOrder;
        newCategories[currentIndex].sortOrder = newCategories[newIndex].sortOrder;
        newCategories[newIndex].sortOrder = tempOrder;

        setCategories(newCategories.sort((a, b) => a.sortOrder - b.sortOrder));

        // Update both categories in backend
        try {
            await Promise.all([
                fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sortOrder: newCategories.find(c => c._id === categoryId).sortOrder })
                }),
                fetch(`${API_BASE_URL}/api/categories/${newCategories[newIndex]._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sortOrder: newCategories[newIndex].sortOrder })
                })
            ]);
            
            setMessage('Category order updated successfully');
            await fetchCategories();
        } catch (error) {
            setMessage('Error updating category order');
            console.error('Error:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Category Management</h1>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                    </button>
                </div>
                
                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${
                        message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Category Form */}
                {showForm && (
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            {editingCategory ? 'Edit Category' : 'Add New Category'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                        placeholder="e.g., New Collection"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                    <input
                                        type="number"
                                        value={formData.sortOrder}
                                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"
                                        min="0"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                                </div>
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingCategory ? 'Update Category' : 'Create Category'}
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

                {/* Categories Table */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : categories.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No categories created yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Order</th>
                                    <th className="px-4 py-3">Category Name</th>
                                    <th className="px-4 py-3">Sort Order</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category, index) => (
                                    <tr key={category._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            <div className="flex items-center space-x-2">
                                                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-sm">
                                                    {index + 1}
                                                </span>
                                                <div className="flex flex-col">
                                                    <button
                                                        onClick={() => handleMove(category._id, 'up')}
                                                        disabled={index === 0}
                                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    >
                                                        <ArrowUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMove(category._id, 'down')}
                                                        disabled={index === categories.length - 1}
                                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    >
                                                        <ArrowDown size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                                        <td className="px-4 py-3">{category.sortOrder}</td>
                                        <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                            <button
                                                onClick={() => handleEdit(category)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category._id)}
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

export default CategoryManager;