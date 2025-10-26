import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Zap, Package, X, Plus, Edit, Trash2, Eye } from 'lucide-react';

// Use your live backend URL
const API_BASE_URL = 'https://siraj-backend.onrender.com';

// --- Initial State Definitions ---
const initialBundleItem = {
    subProductName: 'Item',
    size: '',
    // Store allowedScents as an array in state, convert to/from string for API/DB
    allowedScents: ['Vanilla Cookie'],
};

const initialProductState = {
    _id: null, // To track if we are editing
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
    // --- State Variables ---
    const [formData, setFormData] = useState(initialProductState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [products, setProducts] = useState([]); // Holds the list of products
    const [orders, setOrders] = useState([]);     // Holds the list of orders
    const [isLoadingData, setIsLoadingData] = useState(true); // Loading state for lists
    const [isEditing, setIsEditing] = useState(false); // Flag for edit mode
    const [viewingOrder, setViewingOrder] = useState(null); // Holds the order being viewed in detail

    // --- Data Fetching Functions ---
    const fetchProducts = useCallback(async () => {
        setMessage(''); // Clear message on fetch start
        try {
            // Fetch ALL products including inactive ones for the admin view
            const response = await fetch(`${API_BASE_URL}/api/products?limit=1000&status=Active&status=Inactive`);
            if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
            const data = await response.json();
            setProducts(data.results || []); // Update product list state
        } catch (error) {
            console.error("Error fetching products:", error);
            setMessage(`Error: Could not load products. ${error.message}`);
            setProducts([]); // Ensure products is an array even on error
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        setMessage(''); // Clear message on fetch start
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            if (!response.ok) throw new Error(`Failed to fetch orders: ${response.statusText}`);
            const data = await response.json();
            setOrders(data || []); // Update order list state
        } catch (error) {
            console.error("Error fetching orders:", error);
            setMessage(`Error: Could not load orders. ${error.message}`);
            setOrders([]); // Ensure orders is an array even on error
        }
    }, []);

    // --- Initial Data Load ---
    useEffect(() => {
        setIsLoadingData(true);
        Promise.all([fetchProducts(), fetchOrders()])
            .catch(err => console.error("Error during initial data load:", err)) // Catch potential promise rejection
            .finally(() => setIsLoadingData(false));
    }, [fetchProducts, fetchOrders]); // Dependencies ensure re-fetch if functions change (they won't here)

    // --- Form Utility ---
    const resetForm = useCallback(() => {
        setFormData(initialProductState);
        setIsEditing(false); // Exit edit mode
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = null; // Clear the file input visually
        setMessage(''); // Clear any success/error message
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
    }, []);

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
        setFormData(prev => ({ ...prev, selectedFiles: files.slice(0, 5) })); // Limit to 5 files
    }, []);
    const removeFile = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
        }));
    }, []);
    // Note: Add removeExistingImage handler here if you implement that feature

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
                    ...initialBundleItem, // Start with defaults
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

    // --- Main Submit Handler (Handles BOTH Create and Update) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        // 1. Validation
        if (!isEditing && formData.selectedFiles.length === 0) {
            setMessage('Error: Please upload at least one image for new products.');
            setIsSubmitting(false); return;
        }
        if (!formData.category) {
            setMessage('Error: Category is required.');
            setIsSubmitting(false); return;
        }
        if (formData.productType === 'Single' && !formData.name_en.trim()) {
            setMessage('Error: Name (English) is required for Single products.');
            setIsSubmitting(false); return;
        }
        if (formData.productType === 'Bundle' && !formData.bundleName.trim()) {
            setMessage('Error: Bundle Name is required for Bundles.');
            setIsSubmitting(false); return;
        }
        // Add more validation as needed (e.g., price > 0, stock >= 0)

        // 2. Prepare productDetails object (CRITICAL: Match backend schema/controller)
        let productDetails = {
            productType: formData.productType,
            category: formData.category,
            price_egp: formData.price_egp,
            stock: formData.stock,
            status: formData.status,
            featured: formData.featured,
            // Convert arrays back to comma-separated strings for backend storage
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
                allowedScents: item.allowedScents.join(', ') // Convert array back to string
            }));
            // Optionally remove fields not applicable to bundles
            delete productDetails.scents;
            delete productDetails.size;
            delete productDetails.formattedDescription;
            delete productDetails.burnTime;
            delete productDetails.wickType;
            delete productDetails.coverageSpace;
        }

        // 3. Create FormData for multipart submission
        const data = new FormData();
        formData.selectedFiles.forEach(file => { data.append('productImages', file); });
        data.append('productData', JSON.stringify(productDetails));
        // If editing, you might need to send info about which existing images to keep/delete

        // 4. Determine API endpoint and method
        const url = isEditing ? `${API_BASE_URL}/api/products/${formData._id}` : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        // 5. Make API Call
        try {
            const response = await fetch(url, { method, body: data });
            const result = await response.json();

            if (response.ok && result.success) { // Check for success flag
                const action = isEditing ? 'updated' : 'created';
                const productName = result.product?.name_en || result.product?.bundleName || result.product?.name || 'product';
                setMessage(`Success! Product "${productName}" ${action}.`);
                resetForm(); // Clear form and exit edit mode
                await fetchProducts(); // Refresh product list
            } else {
                setMessage(`Error ${isEditing ? 'updating' : 'creating'} product: ${result.message || result.error || `Server responded with status ${response.status}`}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}. Please check connection or API URL.`);
            console.error('Submission Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Edit Product Logic ---
    const handleEditProduct = (productToEdit) => {
        // Prepare state for the form, converting stored strings back to arrays
        const scentsArray = (productToEdit.scents || '').split(',').map(s => s.trim()).filter(Boolean);
        const bundleItemsFormatted = (productToEdit.bundleItems || []).map(item => ({
            ...item,
            allowedScents: (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean)
        }));

        setFormData({
            ...initialProductState, // Start with defaults
            ...productToEdit,       // Spread the product data over defaults
            _id: productToEdit._id, // Ensure ID is correctly set
            // Overwrite specific fields that need array format for the form
            scents: scentsArray,
            bundleItems: bundleItemsFormatted,
            selectedFiles: [], // Crucially, clear selected files when starting an edit
            imagePaths: productToEdit.imagePaths || [], // Keep existing image URLs
        });
        setIsEditing(true); // Set edit mode flag
        setMessage('Editing product. Upload images only to ADD new ones.'); // Inform user
        const formElement = document.getElementById('product-form-section');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Delete Product Logic ---
    const handleDeleteProduct = async (productId, productName) => {
        if (!window.confirm(`Are you sure you want to delete "${productName}"? This cannot be undone.`)) return;

        setIsSubmitting(true);
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, { method: 'DELETE' });
            const result = await response.json();
            if (response.ok && result.success) {
                setMessage(`Success! Product "${productName}" deleted.`);
                await fetchProducts();
                 if (formData._id === productId) resetForm(); // Reset form if deleting current edit target
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

    // --- Order Management Logic ---
    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Update order ${orderId.slice(-6)} status to "${newStatus}"?`)) return;

        setIsSubmitting(true); // Use same state for simplicity, consider separate state if needed
        // setMessage(''); // Decide if you want product messages cleared on order actions
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (response.ok && result.order) {
                console.log(`Order ${orderId.slice(-6)} status updated.`); // Maybe use a toast notification instead of main message area
                await fetchOrders();
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

    // --- Render Logic ---
    const isBundle = formData.productType === 'Bundle';

    // --- FINAL JSX ---
    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
            {/* Tailwind/Font links should be in the main admin-upload.html */}

            <div className="max-w-7xl mx-auto space-y-12">

                {/* --- Product Uploader/Editor Form --- */}
                <div id="product-form-section" className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
                            <Zap className="w-6 h-6 mr-2 text-indigo-600" />
                            {isEditing ? 'Edit Product' : 'Add New Product'}
                        </h1>
                        {isEditing && (
                            <button onClick={resetForm} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1 border border-indigo-200 rounded hover:bg-indigo-50">
                                Cancel Edit / Add New
                            </button>
                        )}
                    </div>
                    {/* Info Text */}
                    <p className="text-sm text-gray-600 mb-6">
                        {isEditing ? `Updating product ID: ...${formData._id?.slice(-6)}. Upload images to ADD to existing.` : 'Define core properties, bundle items if applicable. Uses Cloudinary.'}
                    </p>

                    {/* Global Message Area */}
                    {message && (
                        <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                            {message}
                        </div>
                    )}

                    {/* --- THE FORM JSX --- */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* --- Product Type Toggle --- */}
                        <fieldset className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                             <legend className="block text-lg font-semibold text-indigo-800 mb-3">
                                <Package className="w-5 h-5 inline mr-2 align-text-bottom" /> Product Type
                             </legend>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center cursor-pointer bg-white p-3 rounded-xl shadow-sm transition hover:shadow-md">
                                    <input type="radio" name="productType" value="Single" checked={formData.productType === 'Single'} onChange={handleChange} className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                                    <span className="ml-2 font-medium text-gray-700">Single Product</span>
                                </label>
                                <label className="flex items-center cursor-pointer bg-white p-3 rounded-xl shadow-sm transition hover:shadow-md">
                                    <input type="radio" name="productType" value="Bundle" checked={formData.productType === 'Bundle'} onChange={handleChange} className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                                    <span className="ml-2 font-medium text-gray-700">Product Bundle</span>
                                </label>
                            </div>
                        </fieldset>

                        {/* --- Core Details Section --- */}
                        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t pt-6">
                            <legend className="md:col-span-2 text-xl font-bold text-gray-800 mb-4"> General Details </legend>

                            {/* Name Input (Conditional) */}
                            {isBundle ? (
                                <div className="col-span-1">
                                    <label htmlFor="bundleName" className="block text-sm font-medium text-gray-700 mb-1">Bundle Name <span className="text-red-500">*</span></label>
                                    <input type="text" name="bundleName" id="bundleName" value={formData.bundleName} onChange={handleChange} required className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                                </div>
                            ) : (
                                <div className="col-span-1">
                                    <label htmlFor="name_en" className="block text-sm font-medium text-gray-700 mb-1">Name (English) <span className="text-red-500">*</span></label>
                                    <input type="text" name="name_en" id="name_en" value={formData.name_en} onChange={handleChange} required className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                                </div>
                            )}

                             {/* Category */}
                            <div className="col-span-1">
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                                <select name="category" id="category" value={formData.category} onChange={handleChange} required className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                    <option value="">Select Category</option>
                                    <option value="Candles">Candles</option>
                                    <option value="Freshener">Freshener</option>
                                    <option value="Diffuser">Diffuser</option>
                                    <option value="Gift Set">Gift Set</option> {/* Added Gift Set */}
                                </select>
                            </div>

                            {/* Featured */}
                            <div className="md:col-span-2 flex items-center gap-x-3 pt-3"> {/* Adjusted span */}
                                <input type="checkbox" name="featured" id="featured" checked={formData.featured} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                                <label htmlFor="featured" className="block text-sm font-medium text-gray-700">Featured Product (Show on Homepage)</label>
                            </div>
                            {/* Status */}
                            <div className="col-span-1">
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select name="status" id="status" value={formData.status} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                    <option value="Active">Active (Visible on site)</option>
                                    <option value="Inactive">Inactive (Hidden from site)</option>
                                </select>
                            </div>

                            {/* Price */}
                            <div className="col-span-1">
                                <label htmlFor="price_egp" className="block text-sm font-medium text-gray-700 mb-1">Price (EGP) <span className="text-red-500">*</span></label>
                                <input type="number" name="price_egp" id="price_egp" value={formData.price_egp} onChange={handlePriceChange} required min="0" step="0.01" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                            </div>
                            {/* Stock */}
                            <div className="col-span-1">
                                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity <span className="text-red-500">*</span></label>
                                <input type="number" name="stock" id="stock" value={formData.stock} onChange={handleStockChange} required min="0" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                            </div>

                            {/* Size (Only for Single Product) */}
                            {!isBundle && (
                                <div className="col-span-1">
                                    <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                                    <input type="text" name="size" id="size" value={formData.size} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder='e.g., "200 gm", "Small"'/>
                                </div>
                            )}
                            {/* Scents (Only for Single Product) */}
                            {!isBundle && (
                                <div className="md:col-span-2"> {/* Adjusted span */}
                                     <label htmlFor="scents" className="block text-sm font-medium text-gray-700 mb-1">Available Scents (Comma separated)</label>
                                     <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Lavender, Vanilla, Rose"/>
                                </div>
                            )}
                        </fieldset>

                        {/* --- Product Specifications Section (Conditional - Only for Single Product) --- */}
                        {!isBundle && (
                             <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 border-t pt-6">
                                <legend className="md:col-span-3 text-xl font-bold text-gray-800 mb-4"> Product Specifications </legend>
                                <div>
                                    <label htmlFor="burnTime" className="block text-sm font-medium text-gray-700 mb-1">Burn Time</label>
                                    <input type="text" name="burnTime" id="burnTime" value={formData.burnTime} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 40-45 hours"/>
                                </div>
                                <div>
                                    <label htmlFor="wickType" className="block text-sm font-medium text-gray-700 mb-1">Wick Type</label>
                                    <input type="text" name="wickType" id="wickType" value={formData.wickType} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Cotton, Wood"/>
                                </div>
                                <div>
                                    <label htmlFor="coverageSpace" className="block text-sm font-medium text-gray-700 mb-1">Coverage Space</label>
                                    <input type="text" name="coverageSpace" id="coverageSpace" value={formData.coverageSpace} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 15-20 m2 bedroom"/>
                                </div>
                             </fieldset>
                        )}

                        {/* --- Descriptions Section --- */}
                        <fieldset className="space-y-4 border-t pt-6">
                            <legend className="text-xl font-bold text-gray-800 mb-4"> Description </legend>
                            {/* Short Description (Conditional) */}
                            {isBundle ? (
                                <div>
                                    <label htmlFor="bundleDescription" className="block text-sm font-medium text-gray-700 mb-1">Bundle Description</label>
                                    <textarea name="bundleDescription" id="bundleDescription" value={formData.bundleDescription} onChange={handleChange} rows="3" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"></textarea>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="description_en" className="block text-sm font-medium text-gray-700 mb-1">Short Description (English)</label>
                                    <textarea name="description_en" id="description_en" value={formData.description_en} onChange={handleChange} rows="3" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="A concise summary..."></textarea>
                                </div>
                            )}
                             {/* Formatted Description (Only for Single Product) */}
                            {!isBundle && (
                                <div>
                                    <label htmlFor="formattedDescription" className="block text-sm font-medium text-gray-700 mb-1">Detailed/Formatted Description (Optional)</label>
                                    <textarea name="formattedDescription" id="formattedDescription" value={formData.formattedDescription} onChange={handleChange} rows="5" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="Use basic HTML for bold, line breaks etc..."></textarea>
                                </div>
                            )}
                        </fieldset>

                         {/* --- Image Uploads Section --- */}
                         <fieldset className="border-t pt-6">
                            <legend className="text-xl font-bold text-gray-800 mb-4">
                                Images (Max 5 total) {!isEditing && <span className="text-red-500">* Required for new</span>}
                            </legend>
                            {/* Display existing images when editing */}
                             {isEditing && formData.imagePaths && formData.imagePaths.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Current Images:</p>
                                    <div className="flex flex-wrap gap-3">
                                        {formData.imagePaths.map((url, index) => (
                                            <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={url} alt={`Current ${index + 1}`} className="w-full h-full object-cover"/>
                                                {/* Optional: Add button here to remove existing image */}
                                                {/* <button type="button" onClick={() => removeExistingImage(index)} className="absolute top-0 right-0 p-1 bg-red-600 ..."><X size={12}/></button> */}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Upload new images below to add more.</p>
                                </div>
                            )}
                            {/* File Input */}
                             <input
                                type="file"
                                id="file-upload"
                                multiple
                                accept="image/*" // Accept only image files
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                            />
                            <p className="mt-2 text-xs text-gray-500"> High-res JPG/PNG recommended. First image is the main display image. </p>
                            {/* New File Previews */}
                            <div className="mt-4 flex flex-wrap gap-3">
                                {formData.selectedFiles.map((file, index) => (
                                    <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="w-full h-full object-cover"/>
                                        <button type="button" onClick={() => removeFile(index)} className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition duration-300" title="Remove image">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </fieldset>

                        {/* --- Bundle Items Section (Conditional) --- */}
                        {isBundle && (
                            <fieldset className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 space-y-6">
                                <legend className="text-xl font-bold text-yellow-800 flex items-center">
                                    <Package className="w-5 h-5 mr-2" /> Bundle Items (Up to 10)
                                </legend>
                                <p className="text-sm text-yellow-700">Define the components and their scent options.</p>

                                {formData.bundleItems.map((item, index) => (
                                    <div key={index} className="p-4 border border-yellow-300 rounded-lg bg-white shadow-sm relative">
                                        <h3 className="font-semibold text-gray-800 mb-3 flex justify-between items-center">
                                             Item #{index + 1}
                                             {/* Removed name from header as it's editable below */}
                                            {formData.bundleItems.length > 1 && (
                                                <button type="button" onClick={() => removeBundleItem(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition" title="Remove Item">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                                                <input type="text" value={item.subProductName} onChange={(e) => handleBundleItemChange(index, 'subProductName', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500"/>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                                                <input type="text" value={item.size} onChange={(e) => handleBundleItemChange(index, 'size', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., 200 gm"/>
                                            </div>
                                            <div>
                                                 <label className="block text-xs font-medium text-gray-600 mb-1">Allowed Scents (Comma Separated)</label>
                                                 <input type="text" value={item.allowedScents.join(', ')} onChange={(e) => handleBundleScentsChange(index, e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Rose, Vanilla"/>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {formData.bundleItems.length < 10 && (
                                    <button type="button" onClick={addBundleItem} className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-yellow-400 text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition">
                                        <Plus className="w-4 h-4 mr-1" /> Add Bundle Item
                                    </button>
                                )}
                            </fieldset>
                        )}

                        {/* --- Submission Button --- */}
                        <div className="pt-6 border-t mt-8"> {/* Added mt-8 for spacing */}
                            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                                {isSubmitting ? (
                                    <><RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Submitting...</>
                                ) : (
                                    isEditing ? 'Update Product' : 'Submit Product / Bundle'
                                )}
                            </button>
                        </div>
                    </form>
                    {/* ===== END OF FORM JSX ===== */}
                </div>

                {/* --- Loading Indicator for Lists --- */}
                {isLoadingData && <p className="text-center text-gray-600 py-10">Loading management sections...</p>}

                {/* --- Product Management List --- */}
                {!isLoadingData && (
                    <div id="product-list-section" className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Products</h2>
                        {products.length === 0 ? ( <p className="text-gray-500">No products found. Add one using the form above!</p> ) : (
                            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Image</th>
                                            <th scope="col" className="px-4 py-3">Name</th>
                                            <th scope="col" className="px-4 py-3">Type</th>
                                            <th scope="col" className="px-4 py-3">Price (EGP)</th>
                                            <th scope="col" className="px-4 py-3">Stock</th>
                                            <th scope="col" className="px-4 py-3">Status</th>
                                            <th scope="col" className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(product => (
                                            <tr key={product._id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-3"><img src={product.imagePaths?.[0] || './images/placeholder.jpg'} alt="" className="w-10 h-10 object-cover rounded"/></td>
                                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{product.name_en || product.bundleName || product.name || 'N/A'}</td>
                                                <td className="px-4 py-3">{product.productType}</td>
                                                <td className="px-4 py-3">{product.price_egp?.toFixed(2)}</td>
                                                <td className="px-4 py-3">{product.stock}</td>
                                                <td className="px-4 py-3"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{product.status}</span></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                                     <button onClick={() => handleEditProduct(product)} title="Edit" className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"><Edit size={16}/></button>
                                                     <button onClick={() => handleDeleteProduct(product._id, product.name_en || product.bundleName || product.name)} title="Delete" className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- Order Management List --- */}
                {!isLoadingData && (
                    <div id="order-list-section" className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Orders</h2>
                         {orders.length === 0 ? ( <p className="text-gray-500">No orders found yet.</p> ) : (
                             <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                                 <table className="w-full text-sm text-left text-gray-500">
                                     <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Order ID</th>
                                            <th scope="col" className="px-4 py-3">Date</th>
                                            <th scope="col" className="px-4 py-3">Customer</th>
                                            <th scope="col" className="px-4 py-3">Total (EGP)</th>
                                            <th scope="col" className="px-4 py-3">Status</th>
                                            <th scope="col" className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                     <tbody>
                                        {orders.map(order => (
                                             <tr key={order._id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap truncate" style={{maxWidth: '100px'}} title={order._id}>...{order._id.slice(-6)}</td>
                                                <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">{order.customerInfo?.name || 'N/A'}</td>
                                                <td className="px-4 py-3">{order.totalAmount?.toFixed(2)}</td>
                                                <td className="px-4 py-3">
                                                    {/* Status Dropdown */}
                                                     <select
                                                        value={order.status}
                                                        onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                                        className={`p-1 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                                            order.status === 'Delivered' ? 'bg-green-100 text-green-800 border-green-300' :
                                                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                            order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-800 border-red-300' :
                                                            'bg-gray-100 text-gray-800 border-gray-300'
                                                        }`}
                                                        disabled={isSubmitting} // Disable while any action is processing
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Processing">Processing</option>
                                                        <option value="Shipped">Shipped</option>
                                                        <option value="Delivered">Delivered</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                                     <button onClick={() => handleViewOrder(order)} title="View Details" className="text-gray-500 hover:text-indigo-600 p-1 hover:bg-gray-100 rounded"><Eye size={16}/></button>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         )}
                    </div>
                )}

                {/* --- Order Details Modal --- */}
                {viewingOrder && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4" onClick={closeOrderView}>
                       <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
                           <div className="flex justify-between items-center border-b pb-3 mb-4">
                               <h3 className="text-xl font-semibold text-gray-900">Order Details (...{viewingOrder._id.slice(-6)})</h3>
                               <button onClick={closeOrderView} className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
                                   <X size={20}/>
                                   <span className="sr-only">Close modal</span>
                               </button>
                           </div>
                           <div className="text-sm space-y-3 max-h-[60vh] overflow-y-auto pr-2"> {/* Scrollable content */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                   <div><p><strong>Date:</strong> {new Date(viewingOrder.createdAt).toLocaleString()}</p></div>
                                   <div><p><strong>Status:</strong> {viewingOrder.status}</p></div>
                                   <div><p><strong>Customer:</strong> {viewingOrder.customerInfo.name}</p></div>
                                   <div><p><strong>Email:</strong> {viewingOrder.customerInfo.email}</p></div>
                                   <div><p><strong>Phone:</strong> {viewingOrder.customerInfo.phone}</p></div>
                                   <div><p><strong>Payment:</strong> {viewingOrder.paymentMethod}</p></div>
                                   <div className="md:col-span-2"><p><strong>Address:</strong> {viewingOrder.customerInfo.address}, {viewingOrder.customerInfo.city}</p></div>
                                   {viewingOrder.customerInfo.notes && <div className="md:col-span-2"><p><strong>Notes:</strong> {viewingOrder.customerInfo.notes}</p></div>}
                               </div>
                               <hr/>
                               <p className="font-semibold mt-4"><strong>Items:</strong></p>
                               <ul className="list-disc list-inside space-y-1 pl-1">
                                   {viewingOrder.items.map((item, index) => (
                                       <li key={index}>
                                           {item.name} x {item.quantity} @ {item.price?.toFixed(2)} EGP
                                           {item.customization && item.customization.length > 0 && <span className="text-xs text-gray-500"> ({item.customization.join(', ')})</span>}
                                       </li>
                                   ))}
                               </ul>
                               <hr className="my-4"/>
                               <div className="grid grid-cols-2 gap-x-4 text-right">
                                    <p>Subtotal:</p><p>{viewingOrder.subtotal?.toFixed(2)} EGP</p>
                                    <p>Shipping:</p><p>{viewingOrder.shippingFee?.toFixed(2)} EGP</p>
                                    <p className="font-bold">Total:</p><p className="font-bold">{viewingOrder.totalAmount?.toFixed(2)} EGP</p>
                               </div>
                           </div>
                           <div className="mt-6 flex justify-end">
                               <button onClick={closeOrderView} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">Close</button>
                           </div>
                       </div>
                   </div>
                )}

            </div> {/* End Max Width Container */}
        </div> // End Main Div
    );
};