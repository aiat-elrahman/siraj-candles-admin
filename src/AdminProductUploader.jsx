import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Zap, Package, X, Plus, Edit, Trash2, Eye } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

// --- Initial State Definitions ---
const initialBundleItem = {
    subProductName: 'Item',
    size: '',
    // Store allowedScents as an array in state, convert to/from string for API/DB
    allowedScents: ['Vanilla Cookie'],
};

const initialProductState = {
    _id: null,
    productType: 'Single',
    category: '',
    price_egp: 0,
    stock: 0,
    status: 'Active',
    featured: false,
    name_en: '',
    description_en: '',
    // Store scents as an array in state, convert to/from string for API/DB
    scents: [],
    size: '',
    formattedDescription: '',
    burnTime: '',
    wickType: '',
    coverageSpace: '',
    bundleName: '',
    bundleDescription: '',
    bundleItems: [
        { ...initialBundleItem, subProductName: 'Big Jar Candle 1' },
        { ...initialBundleItem, subProductName: 'Big Jar Candle 2' },
        { ...initialBundleItem, subProductName: 'Wax Freshener' },
    ],
    selectedFiles: [], // For new file uploads
    imagePaths: [],    // For displaying existing image URLs during edit
};

// --- Main Component ---
export const AdminProductUploader = () => {
    // --- State ---
    const [formData, setFormData] = useState(initialProductState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);

    // --- Data Fetching ---
    const fetchProducts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/products?limit=1000&status=Active&status=Inactive`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setProducts(data.results || []);
        } catch (error) {
            console.error("Error fetching products:", error);
            setMessage(`Error: Could not load products. ${error.message}`);
            setProducts([]); // Clear products on error
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setOrders(data || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setMessage(`Error: Could not load orders. ${error.message}`);
            setOrders([]); // Clear orders on error
        }
    }, []);

    useEffect(() => {
        setIsLoading(true);
        setMessage(''); // Clear message on load
        Promise.all([fetchProducts(), fetchOrders()])
            .catch(err => { /* Errors already handled */ })
            .finally(() => setIsLoading(false));
    }, [fetchProducts, fetchOrders]);

    // --- Form Utility ---
    const resetForm = () => {
        setFormData(initialProductState);
        setIsEditing(false);
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = null; // Clear file input
        setMessage('');
    };

    // --- Basic Form Input Handlers ---
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    }, []);
    const handlePriceChange = useCallback((e) => {
        const value = parseFloat(e.target.value) || 0;
        setFormData(prev => ({ ...prev, price_egp: value }));
    }, []);
    const handleStockChange = useCallback((e) => {
        const value = parseInt(e.target.value, 10) || 0;
        setFormData(prev => ({ ...prev, stock: value }));
    }, []);

    // --- Scent Handlers (Keep state as array, join before submit) ---
     const handleScentsChange = useCallback((e) => {
        const scentsArray = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, scents: scentsArray }));
    }, []);
     const handleBundleScentsChange = useCallback((index, value) => {
        const scentsArray = value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => {
            const newBundleItems = [...prev.bundleItems];
            newBundleItems[index].allowedScents = scentsArray;
            return { ...prev, bundleItems: newBundleItems };
        });
    }, []);

    // --- Image Handlers ---
    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({ ...prev, selectedFiles: files.slice(0, 5) }));
    }, []);
    const removeFile = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
        }));
    }, []);
    // TODO: Add removeExistingImage handler if needed for edit mode

    // --- Bundle Item Handlers ---
    const handleBundleItemChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const newBundleItems = [...prev.bundleItems];
            newBundleItems[index][field] = value; // Use field directly (subProductName, size)
            return { ...prev, bundleItems: newBundleItems };
        });
    }, []);
     const addBundleItem = useCallback(() => {
        if (formData.bundleItems.length < 10) {
            setFormData(prev => ({
                ...prev,
                bundleItems: [...prev.bundleItems, {
                    ...initialBundleItem,
                    subProductName: `Item ${prev.bundleItems.length + 1}`
                }],
            }));
        }
    }, [formData.bundleItems.length]);
    const removeBundleItem = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            bundleItems: prev.bundleItems.filter((_, i) => i !== index),
        }));
    }, []);


    // --- Main Submit Handler (Create/Update Product) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        // Validation
        if (!isEditing && formData.selectedFiles.length === 0) {
            setMessage('Error: Please upload at least one image for new products.');
            setIsSubmitting(false);
            return;
        }
        if (!formData.category) {
             setMessage('Error: Category is required.');
            setIsSubmitting(false);
            return;
        }
         if (formData.productType === 'Single' && !formData.name_en) {
             setMessage('Error: Name (English) is required for Single products.');
            setIsSubmitting(false);
            return;
        }
         if (formData.productType === 'Bundle' && !formData.bundleName) {
             setMessage('Error: Bundle Name is required for Bundles.');
            setIsSubmitting(false);
            return;
        }

        // Prepare data matching Mongoose schema & controller expectations
        let productDetails = {
            productType: formData.productType,
            category: formData.category,
            price_egp: formData.price_egp,
            stock: formData.stock,
            status: formData.status,
            featured: formData.featured,
            // Convert arrays back to comma-separated strings for backend
            scents: formData.scents.join(', '),
            size: formData.size,
            formattedDescription: formData.formattedDescription,
            burnTime: formData.burnTime,
            wickType: formData.wickType,
            coverageSpace: formData.coverageSpace,
        };

        if (formData.productType === 'Single') {
            productDetails.name_en = formData.name_en;
            productDetails.description_en = formData.description_en;
        } else { // Bundle
            productDetails.bundleName = formData.bundleName;
            productDetails.bundleDescription = formData.bundleDescription;
            productDetails.bundleItems = formData.bundleItems.map(item => ({
                ...item,
                // Convert allowedScents array back to string
                allowedScents: item.allowedScents.join(', ')
            }));
            // Remove single-product-only fields if necessary (controller also handles this)
             delete productDetails.scents;
             delete productDetails.size;
             // etc. for burnTime, wickType, coverageSpace if they shouldn't exist on bundles
        }


        const data = new FormData();
        formData.selectedFiles.forEach(file => { data.append('productImages', file); });
        data.append('productData', JSON.stringify(productDetails));

        const url = isEditing ? `${API_BASE_URL}/api/products/${formData._id}` : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, body: data });
            const result = await response.json();

            if (response.ok) {
                const action = isEditing ? 'updated' : 'created';
                const productName = result.product?.name_en || result.product?.bundleName || result.product?.name || 'product';
                const productId = result.product?._id || '';
                setMessage(`Success! Product "${productName}" ${action}. ID: ${productId}`);
                resetForm();
                await fetchProducts(); // Refresh list
            } else {
                 setMessage(`Error ${isEditing ? 'updating' : 'creating'} product: ${result.message || result.error || `Status ${response.status}`}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}. Check CORS/API URL.`);
            console.error('Submission Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Edit Product ---
    const handleEditProduct = (product) => {
        // Prepare state for the form, converting strings back to arrays
        const scentsArray = (product.scents || '').split(',').map(s => s.trim()).filter(Boolean);
        const bundleItemsFormatted = (product.bundleItems || []).map(item => ({
            ...item,
            allowedScents: (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean)
        }));

        setFormData({
            ...initialProductState, // Reset non-product fields like selectedFiles
            ...product,            // Spread fetched data
            _id: product._id,
            // Ensure array formats for form state
            scents: scentsArray,
            bundleItems: bundleItemsFormatted,
            selectedFiles: [], // Clear file input for edit mode
            imagePaths: product.imagePaths || [], // Keep existing image URLs
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMessage('Editing product. Upload new images only if you want to add them.');
    };

    // --- Delete Product ---
    const handleDeleteProduct = async (productId, productName) => {
        if (!window.confirm(`Are you sure you want to delete "${productName}"? This cannot be undone.`)) return;

        setIsSubmitting(true);
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, { method: 'DELETE' });
            const result = await response.json();
            if (response.ok) {
                setMessage(`Success! Product "${productName}" deleted.`);
                await fetchProducts(); // Refresh list
            } else {
                 setMessage(`Error deleting product: ${result.message || result.error || `Status ${response.status}`}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}.`);
            console.error('Delete Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Order Management ---
    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Update order ${orderId.slice(-6)} status to "${newStatus}"?`)) return;

        setIsSubmitting(true);
        setMessage(''); // Clear product message area or use a dedicated order message state
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (response.ok) {
                setMessage(`Success! Order ${orderId.slice(-6)} status updated.`); // Use slice for brevity
                await fetchOrders(); // Refresh list
            } else {
                 setMessage(`Error updating order: ${result.message || result.error || `Status ${response.status}`}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}.`);
            console.error('Order Update Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleViewOrder = (order) => setViewingOrder(order);
    const closeOrderView = () => setViewingOrder(null);

    const isBundle = formData.productType === 'Bundle';

    // --- JSX ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
            {/* Links and Scripts in head via HTML */}

            <div className="max-w-6xl mx-auto space-y-10">

                {/* --- Product Uploader/Editor Form --- */}
                <div id="product-form-section" className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                            <Zap className="w-6 h-6 mr-2 text-indigo-600" />
                            {isEditing ? 'Edit Product' : 'Add New Product'}
                        </h1>
                        {isEditing && (
                            <button onClick={resetForm} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                Cancel Edit / Add New
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mb-8">
                        {isEditing ? `Updating product ID: ${formData._id?.slice(-6)}. Upload new images to add.` : 'Define core properties, bundle items if applicable. Uses Cloudinary.'}
                    </p>

                    {message && (
                        <div className={`p-4 mb-6 rounded-lg font-medium text-sm ${message.startsWith('Error') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                            {message}
                        </div>
                    )}

                    {/* ======================================================= */}
                    {/* ===== THIS IS THE FORM JSX YOU WERE MISSING ========= */}
                    {/* ======================================================= */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                         {/* --- Product Type Toggle --- */}
                         <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                             <label className="block text-lg font-semibold text-indigo-800 mb-3">
                                <Package className="w-5 h-5 inline mr-2 align-text-bottom" /> Product Type
                            </label>
                            <div className="flex space-x-4">
                                <label className="flex items-center cursor-pointer bg-white p-3 rounded-xl shadow-md transition hover:shadow-lg">
                                    <input type="radio" name="productType" value="Single" checked={formData.productType === 'Single'} onChange={handleChange} className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                                    <span className="ml-2 font-medium text-gray-700">Single Product</span>
                                </label>
                                <label className="flex items-center cursor-pointer bg-white p-3 rounded-xl shadow-md transition hover:shadow-lg">
                                    <input type="radio" name="productType" value="Bundle" checked={formData.productType === 'Bundle'} onChange={handleChange} className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                                    <span className="ml-2 font-medium text-gray-700">Product Bundle</span>
                                </label>
                            </div>
                        </div>

                         {/* --- Core Product Details Section --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
                            <h2 className="md:col-span-2 text-xl font-bold text-gray-800 border-b pb-2 mb-4"> General Details </h2>

                            {/* Name (Conditional) */}
                            {isBundle ? (
                                <div className="col-span-1">
                                    <label htmlFor="bundleName" className="block text-sm font-medium text-gray-700">Bundle Name <span className="text-red-500">*</span></label>
                                    <input type="text" name="bundleName" id="bundleName" value={formData.bundleName} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                                </div>
                            ) : (
                                <div className="col-span-1">
                                    <label htmlFor="name_en" className="block text-sm font-medium text-gray-700">Name (English) <span className="text-red-500">*</span></label>
                                    <input type="text" name="name_en" id="name_en" value={formData.name_en} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                                </div>
                            )}

                             {/* Category */}
                            <div className="col-span-1">
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                                <select name="category" id="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                    <option value="">Select Category</option>
                                    <option value="Candles">Candles</option>
                                    <option value="Freshener">Freshener</option>
                                    <option value="Diffuser">Diffuser</option>
                                    <option value="Gift Set">Gift Set</option>
                                </select>
                            </div>

                            {/* Featured */}
                            <div className="col-span-1 flex items-center pt-3">
                                <input type="checkbox" name="featured" id="featured" checked={formData.featured} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                                <label htmlFor="featured" className="ml-2 block text-sm font-medium text-gray-700">Featured Product</label>
                            </div>
                            {/* Status */}
                            <div className="col-span-1">
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                                <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Price */}
                            <div className="col-span-1">
                                <label htmlFor="price_egp" className="block text-sm font-medium text-gray-700">Price (EGP) <span className="text-red-500">*</span></label>
                                <input type="number" name="price_egp" id="price_egp" value={formData.price_egp} onChange={handlePriceChange} required min="0" step="0.01" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                            </div>
                            {/* Stock */}
                            <div className="col-span-1">
                                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Stock Quantity <span className="text-red-500">*</span></label>
                                <input type="number" name="stock" id="stock" value={formData.stock} onChange={handleStockChange} required min="0" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                            </div>

                            {/* Size (Only for Single Product) */}
                            {!isBundle && (
                                <div className="col-span-1">
                                    <label htmlFor="size" className="block text-sm font-medium text-gray-700">Size (e.g., "200 gm", "Small")</label>
                                    <input type="text" name="size" id="size" value={formData.size} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                                </div>
                            )}
                            {/* Scents (Only for Single Product) */}
                            {!isBundle && (
                                <div className="col-span-2">
                                     <label htmlFor="scents" className="block text-sm font-medium text-gray-700">Available Scents (Comma separated)</label>
                                     <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Apple Cinnamon, Fresh Linen"/>
                                </div>
                            )}
                        </div>

                        {/* --- Product Specifications Section (Conditional - Only for Single Product) --- */}
                        {!isBundle && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
                                <h2 className="md:col-span-3 text-xl font-bold text-gray-800 border-b pb-2 mb-4"> Product Specifications </h2>
                                <div>
                                    <label htmlFor="burnTime" className="block text-sm font-medium text-gray-700">Burn Time</label>
                                    <input type="text" name="burnTime" id="burnTime" value={formData.burnTime} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 40-45 hours"/>
                                </div>
                                <div>
                                    <label htmlFor="wickType" className="block text-sm font-medium text-gray-700">Wick Type</label>
                                    <input type="text" name="wickType" id="wickType" value={formData.wickType} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Cotton, Wood"/>
                                </div>
                                <div>
                                    <label htmlFor="coverageSpace" className="block text-sm font-medium text-gray-700">Coverage Space</label>
                                    <input type="text" name="coverageSpace" id="coverageSpace" value={formData.coverageSpace} onChange={handleChange} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 15-20 m2 bedroom"/>
                                </div>
                            </div>
                        )}

                        {/* --- Descriptions Section --- */}
                        <div className="space-y-4 border-b pb-6">
                            <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4"> Description </h2>
                            {/* Short Description (Conditional) */}
                            {isBundle ? (
                                <div>
                                    <label htmlFor="bundleDescription" className="block text-sm font-medium text-gray-700">Bundle Description</label>
                                    <textarea name="bundleDescription" id="bundleDescription" value={formData.bundleDescription} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"></textarea>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="description_en" className="block text-sm font-medium text-gray-700">Short Description (English)</label>
                                    <textarea name="description_en" id="description_en" value={formData.description_en} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="A concise summary..."></textarea>
                                </div>
                            )}
                             {/* Formatted Description (Only for Single Product) */}
                            {!isBundle && (
                                <div>
                                    <label htmlFor="formattedDescription" className="block text-sm font-medium text-gray-700">Detailed/Formatted Description (Optional)</label>
                                    <textarea name="formattedDescription" id="formattedDescription" value={formData.formattedDescription} onChange={handleChange} rows="5" className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="Use Markdown or basic HTML..."></textarea>
                                </div>
                            )}
                        </div>

                         {/* --- Image Uploads Section --- */}
                         <div className="border-b pb-6">
                            <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
                                Images (Max 5 total) {!isEditing && <span className="text-red-500">* Required for new products</span>}
                            </h2>
                             {/* Show existing images when editing */}
                            {isEditing && formData.imagePaths && formData.imagePaths.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Current Images:</p>
                                    <div className="flex flex-wrap gap-3">
                                        {formData.imagePaths.map((url, index) => (
                                            <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={url} alt={`Current ${index + 1}`} className="w-full h-full object-cover"/>
                                                 {/* TODO: Add button here to remove existing image if needed */}
                                                {/* <button type="button" onClick={() => removeExistingImage(index)} className="absolute top-0 right-0 p-1 ..."><X size={12}/></button> */}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Upload new images below to add more (up to 5 total).</p>
                                </div>
                            )}
                             {/* File Input */}
                            <input
                                type="file"
                                id="file-upload"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                High-res JPG/PNG recommended. Server handles Cloudinary upload.
                            </p>
                             {/* New File Previews */}
                            <div className="mt-4 flex flex-wrap gap-3">
                                {formData.selectedFiles.map((file, index) => (
                                    <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-full object-cover"/>
                                        <button type="button" onClick={() => removeFile(index)} className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition duration-300">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- Bundle Configuration Section (Conditional) --- */}
                        {isBundle && (
                            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 space-y-6">
                                <h2 className="text-xl font-bold text-yellow-800 flex items-center">
                                    <Package className="w-5 h-5 mr-2" /> Bundle Items (Up to 10)
                                </h2>
                                <p className="text-sm text-yellow-700">Define the components and their scent options.</p>

                                {formData.bundleItems.map((item, index) => (
                                    <div key={index} className="p-4 border border-yellow-300 rounded-lg bg-white shadow-sm relative">
                                        <h3 className="font-semibold text-gray-800 mb-3 flex justify-between items-center">
                                             Item #{index + 1}: {item.subProductName}
                                            {formData.bundleItems.length > 1 && (
                                                <button type="button" onClick={() => removeBundleItem(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition" title="Remove Item">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600">Name</label>
                                                <input type="text" value={item.subProductName} onChange={(e) => handleBundleItemChange(index, 'subProductName', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border"/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600">Size</label>
                                                <input type="text" value={item.size} onChange={(e) => handleBundleItemChange(index, 'size', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border" placeholder="e.g., 200 gm"/>
                                            </div>
                                            <div>
                                                 <label className="block text-xs font-medium text-gray-600">Allowed Scents (Comma Separated)</label>
                                                 <input type="text" value={item.allowedScents.join(', ')} onChange={(e) => handleBundleScentsChange(index, e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border" placeholder="e.g., Rose, Vanilla"/>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {formData.bundleItems.length < 10 && (
                                    <button type="button" onClick={addBundleItem} className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-yellow-400 text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition">
                                        <Plus className="w-4 h-4 mr-1" /> Add Bundle Item
                                    </button>
                                )}
                            </div>
                        )}

                        {/* --- Submission Button --- */}
                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out">
                                {isSubmitting ? (
                                    <><RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Submitting...</>
                                ) : (
                                    isEditing ? 'Update Product' : 'Submit Product / Bundle'
                                )}
                            </button>
                        </div>
                    </form>
                    {/* ======================================================= */}
                    {/* ===== END OF MISSING FORM JSX ========================= */}
                    {/* ======================================================= */}
                </div>

                {/* --- Loading Indicator --- */}
                {isLoading && <p className="text-center text-gray-600 py-10">Loading management sections...</p>}

                {/* --- Product Management List --- */}
                {!isLoading && (
                    <div id="product-list-section" className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                        {/* ... (Product list table JSX as provided before) ... */}
                    </div>
                )}

                {/* --- Order Management List --- */}
                {!isLoading && (
                    <div id="order-list-section" className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                       {/* ... (Order list table JSX as provided before) ... */}
                    </div>
                )}

                {/* --- Order Details Modal --- */}
                {viewingOrder && (
                     <div className="fixed inset-0 ..."> {/* Modal Structure */}
                       {/* ... (Order details modal JSX as provided before) ... */}
                    </div>
                )}
            </div>
        </div>
    );
};