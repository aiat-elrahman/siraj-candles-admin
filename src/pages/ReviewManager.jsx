import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Star, Upload, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const ReviewManager = () => {
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newReview, setNewReview] = useState({
        productId: '', name: '', email: '', phone: '',
        rating: 5, comment: '', photos: []
    });

    const token = localStorage.getItem('adminToken');

    useEffect(() => { fetchReviews(); fetchProducts(); }, []);

    const fetchReviews = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/reviews`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setReviews(data);
        } catch (e) { setMessage('Failed to load reviews'); }
        finally { setLoading(false); }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/products?limit=1000`);
            const data = await res.json();
            setProducts(data.results || []);
        } catch (e) {}
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this review?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/reviews/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setReviews(reviews.filter(r => r._id !== id));
            setMessage('Review deleted.');
        } catch (e) { setMessage('Failed to delete.'); }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
            const data = await res.json();
            setNewReview(prev => ({ ...prev, photos: [...prev.photos, data.imageUrl] }));
        } catch (e) { setMessage('Photo upload failed.'); }
        finally { setUploading(false); }
    };

    const handleAddReview = async () => {
        if (!newReview.productId || !newReview.name || !newReview.rating) {
            setMessage('Product, name, and rating are required.'); return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/reviews/admin/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...newReview, isAdminCreated: true })
            });
            if (res.ok) {
                setMessage('✅ Review added!');
                setShowAddForm(false);
                setNewReview({ productId: '', name: '', email: '', phone: '', rating: 5, comment: '', photos: [] });
                fetchReviews();
            } else {
                const err = await res.json();
                setMessage(`Error: ${err.message}`);
            }
        } catch (e) { setMessage('Network error.'); }
    };

    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Review Manager</h1>
                    <button onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Plus className="w-4 h-4" /> Add Review Manually
                    </button>
                </div>

                {message && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg">{message}</div>}

                {showAddForm && (
                    <div className="mb-6 p-5 border-2 border-indigo-100 rounded-xl bg-indigo-50 space-y-4">
                        <h3 className="font-semibold text-gray-800 text-lg">Add Manual Review</h3>
                        <p className="text-sm text-gray-500">Use this to transfer reviews from social media. Upload a screenshot of the customer's original review as a photo.</p>
                        
                        <select value={newReview.productId}
                            onChange={e => setNewReview({...newReview, productId: e.target.value})}
                            className="w-full p-2 border rounded-lg">
                            <option value="">Select Product *</option>
                            {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name_en || p.bundleName}</option>
                            ))}
                        </select>

                        <div className="grid grid-cols-2 gap-3">
                            <input placeholder="Customer Name *" value={newReview.name}
                                onChange={e => setNewReview({...newReview, name: e.target.value})}
                                className="p-2 border rounded-lg" />
                            <input placeholder="Email (optional)" value={newReview.email}
                                onChange={e => setNewReview({...newReview, email: e.target.value})}
                                className="p-2 border rounded-lg" />
                            <input placeholder="Phone (optional)" value={newReview.phone}
                                onChange={e => setNewReview({...newReview, phone: e.target.value})}
                                className="p-2 border rounded-lg" />
                            <select value={newReview.rating}
                                onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})}
                                className="p-2 border rounded-lg">
                                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                            </select>
                        </div>

                        <textarea placeholder="Review comment" value={newReview.comment}
                            onChange={e => setNewReview({...newReview, comment: e.target.value})}
                            className="w-full p-2 border rounded-lg" rows={3} />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Upload Screenshot(s) of Original Review
                            </label>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload}
                                className="block w-full text-sm text-gray-500" />
                            {uploading && <p className="text-sm text-indigo-600 mt-1">Uploading...</p>}
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {newReview.photos.map((url, i) => (
                                    <img key={i} src={url} alt="preview" className="w-20 h-20 object-cover rounded border" />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleAddReview}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                Save Review
                            </button>
                            <button onClick={() => setShowAddForm(false)}
                                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-indigo-600" /></div>
                ) : reviews.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No reviews yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Product</th>
                                    <th className="px-4 py-3 text-left">Customer</th>
                                    <th className="px-4 py-3 text-left">Contact</th>
                                    <th className="px-4 py-3 text-left">Rating</th>
                                    <th className="px-4 py-3 text-left">Comment</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Source</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reviews.map(r => (
                                    <tr key={r._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[150px] truncate">
                                            {r.productId?.name_en || r.productId?.bundleName || '—'}
                                        </td>
                                        <td className="px-4 py-3">{r.name}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            <div>{r.email || '—'}</div>
                                            <div>{r.phone || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-yellow-500">{stars(r.rating)}</td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{r.comment || '—'}</td>
                                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                                            {new Date(r.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.isAdminCreated ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                {r.isAdminCreated ? 'Manual' : 'Customer'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.photos?.length > 0 && (
                                                <div className="flex gap-1 mb-1">
                                                    {r.photos.map((p, i) => (
                                                        <a key={i} href={p} target="_blank" rel="noreferrer">
                                                            <img src={p} alt="" className="w-8 h-8 object-cover rounded border" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            <button onClick={() => handleDelete(r._id)}
                                                className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 className="w-4 h-4" />
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

export default ReviewManager;