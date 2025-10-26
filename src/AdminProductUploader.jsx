import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Zap, Package, X, Plus, Edit, Trash2, Eye } from 'lucide-react'; // Added icons

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const initialBundleItem = {
    subProductName: 'Item',
    size: '',
    allowedScents: ['Vanilla Cookie'],
};

const initialProductState = {
    _id: null, // Add ID for tracking edits
    productType: 'Single',
    category: '',
    price_egp: 0,
    stock: 0,
    status: 'Active',
    featured: false,
    name_en: '',
    description_en: '',
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
    selectedFiles: [],
    imagePaths: [], // To store existing image URLs when editing
};

export const AdminProductUploader = () => {
    const [formData, setFormData] = useState(initialProductState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [products, setProducts] = useState([]); // State for product list
    const [orders, setOrders] = useState([]);     // State for order list
    const [isLoading, setIsLoading] = useState(true); // Loading state
    const [isEditing, setIsEditing] = useState(false); // Edit mode flag
    const [viewingOrder, setViewingOrder] = useState(null); // State to view single order details

    // --- Fetch Products and Orders ---
    const fetchProducts = useCallback(async () => {
        try {
            // Fetch ALL products including inactive for admin view
            const response = await fetch(`${API_BASE_URL}/api/products?limit=1000&status=Active&status=Inactive`); // Adjust limit as needed
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            setProducts(data.results || []);
        } catch (error) {
            console.error("Error fetching products:", error);
            setMessage(`Error: Could not load products. ${error.message}`);
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setMessage(`Error: Could not load orders. ${error.message}`);
        }
    }, []);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([fetchProducts(), fetchOrders()])
            .catch(err => { /* Errors handled in individual fetches */ })
            .finally(() => setIsLoading(false));
    }, [fetchProducts, fetchOrders]); // Re-fetch if functions change (they don't here, but good practice)


    // --- Form Handlers (mostly unchanged, added reset) ---
    const resetForm = () => {
        setFormData(initialProductState);
        setIsEditing(false); // Exit edit mode
         // Clear file input visually (important!)
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = null;
        setMessage(''); // Clear any previous messages
    };

    const handleChange = useCallback((e) => { /* ... (keep existing code) ... */ }, []);
    const handlePriceChange = useCallback((e) => { /* ... (keep existing code) ... */ }, []);
    const handleStockChange = useCallback((e) => { /* ... (keep existing code) ... */ }, []);
    const handleScentsChange = useCallback((e) => { /* ... (keep existing code) ... */ }, []);
    const handleFileChange = useCallback((e) => { /* ... (keep existing code) ... */ }, []);
    const removeFile = useCallback((index) => { /* ... (keep existing code) ... */ }, []);
    const handleBundleItemChange = useCallback((index, field, value) => { /* ... (keep existing code) ... */ }, []);
    const handleBundleScentsChange = useCallback((index, value) => { /* ... (keep existing code) ... */ }, []);
    const addBundleItem = useCallback(() => { /* ... (keep existing code) ... */ }, [formData.bundleItems.length]);
    const removeBundleItem = useCallback((index) => { /* ... (keep existing code) ... */ }, []);


    // --- Submission Logic (Modified for Create/Update) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        // Basic image validation (only require for NEW products)
        if (!isEditing && formData.selectedFiles.length === 0) {
            setMessage('Error: Please upload at least one image for new products.');
            setIsSubmitting(false);
            return;
        }

        // Prepare productDetails (unchanged)
        let productDetails = { /* ... (keep existing preparation logic) ... */ };

        // Create FormData (unchanged)
        const data = new FormData();
        formData.selectedFiles.forEach(file => {
            data.append('productImages', file); // Use 'productImages' key
        });
        data.append('productData', JSON.stringify(productDetails));

        // --- Determine API endpoint and method ---
        const url = isEditing
            ? `${API_BASE_URL}/api/products/${formData._id}`
            : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, body: data });
            const result = await response.json();

            if (response.ok) {
                const action = isEditing ? 'updated' : 'created';
                // Use result.product which is returned by the backend
                const productName = result.product?.name_en || result.product?.bundleName || result.product?.name || 'product';
                const productId = result.product?._id || '';
                setMessage(`Success! Product "${productName}" ${action}. ID: ${productId}`);
                resetForm(); // Reset form after success
                await fetchProducts(); // Refresh product list
            } else {
                 setMessage(`Error ${isEditing ? 'updating' : 'creating'} product: ${result.message || result.error || 'Unknown API error'}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: Could not reach the server. Check CORS/API URL.`);
            console.error('Submission Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Edit Product Logic ---
    const handleEditProduct = (product) => {
         // Convert comma-separated string back to array for form state
        const scentsArray = (product.scents || '').split(',').map(s => s.trim()).filter(Boolean);
        const bundleItemsFormatted = (product.bundleItems || []).map(item => ({
            ...item,
            allowedScents: (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean)
        }));

        setFormData({
            ...initialProductState, // Start fresh but keep structure
            ...product,            // Spread fetched product data
            _id: product._id,      // Ensure ID is set
            scents: scentsArray,   // Overwrite with array format
            bundleItems: bundleItemsFormatted, // Overwrite with array format for scents
            selectedFiles: [],     // Clear selected files for edit
            imagePaths: product.imagePaths || [], // Keep existing image URLs
        });
        setIsEditing(true); // Enter edit mode
        window.scrollTo(0, 0); // Scroll to top to see the form
        setMessage('Editing product. Upload new images only if you want to add more.');
    };

    // --- Delete Product Logic ---
    const handleDeleteProduct = async (productId, productName) => {
        if (!window.confirm(`Are you sure you want to delete "${productName}"? This cannot be undone.`)) {
            return;
        }
        setIsSubmitting(true); // Use submitting state for visual feedback
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, { method: 'DELETE' });
            const result = await response.json();

            if (response.ok) {
                setMessage(`Success! Product "${productName}" deleted.`);
                await fetchProducts(); // Refresh product list
            } else {
                 setMessage(`Error deleting product: ${result.message || result.error || 'Unknown API error'}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: Could not reach the server.`);
            console.error('Delete Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

     // --- Order Management Logic ---
    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Update order ${orderId} status to "${newStatus}"?`)) {
            return;
        }
        setIsSubmitting(true);
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();

            if (response.ok) {
                setMessage(`Success! Order ${orderId} status updated to ${newStatus}.`);
                await fetchOrders(); // Refresh order list
            } else {
                 setMessage(`Error updating order status: ${result.message || result.error || 'Unknown API error'}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: Could not reach the server.`);
            console.error('Order Update Error:', error);
        } finally {
             setIsSubmitting(false);
        }
    };

    // --- View Order Details (Simple Modal/Popup simulation) ---
    const handleViewOrder = (order) => {
        setViewingOrder(order); // Store the order to display details
    };
    const closeOrderView = () => {
        setViewingOrder(null);
    };


    const isBundle = formData.productType === 'Bundle';

    // --- JSX Structure ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
            {/* Tailwind/Font links (Keep as before) */}
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

             {/* Main Content Area */}
            <div className="max-w-6xl mx-auto space-y-10">

                {/* --- Product Uploader/Editor Form --- */}
                 <div className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                            <Zap className="w-6 h-6 mr-2 text-indigo-600" />
                            {isEditing ? 'Edit Product' : 'Admin Product Uploader'}
                        </h1>
                        {isEditing && (
                             <button onClick={resetForm} className="text-sm text-gray-500 hover:text-indigo-600">
                                Cancel Edit / Add New
                             </button>
                        )}
                    </div>
                     <p className="text-sm text-gray-500 mb-8">
                         {isEditing
                            ? `Updating product ID: ${formData._id}. Upload new images only to add them.`
                            : 'Define the core properties, and for bundles, specify the customizable items. Uses Cloudinary via your Render backend for image storage.'
                         }
                    </p>

                    {message && (
                         <div className={`p-4 mb-6 rounded-lg font-medium text-sm ${message.startsWith('Error') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                            {message}
                        </div>
                    )}

                    {/* --- Form (keep your existing form structure) --- */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* --- Product Type Toggle --- */}
                        {/* ... (keep existing code) ... */}

                         {/* --- Core Product Details Section --- */}
                         {/* ... (keep existing code, ensure value={formData.field} matches state) ... */}

                         {/* --- Candle Specification Fields (New) --- */}
                         {/* ... (keep existing code) ... */}

                         {/* --- Descriptions --- */}
                         {/* ... (keep existing code) ... */}

                         {/* --- Image Uploads (Modify slightly for edit) --- */}
                        <div className="border-b pb-6">
                            <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">
                                Image Uploads (Max 5 total) {!isEditing && <span className="text-red-500">*</span>}
                            </h2>
                            {isEditing && formData.imagePaths && formData.imagePaths.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Current Images:</p>
                                    <div className="flex flex-wrap gap-3">
                                        {formData.imagePaths.map((url, index) => (
                                            <img key={index} src={url} alt={`Current ${index + 1}`} className="w-16 h-16 object-cover rounded border"/>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Upload new images below to add to the existing ones.</p>
                                    {/* Add delete image functionality here if needed */}
                                </div>
                            )}
                            <input
                                type="file"
                                id="file-upload"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 /* ... rest of classes ... */"
                            />
                            {/* ... (keep preview logic) ... */}
                        </div>

                         {/* --- Bundle Configuration Section (Conditional) --- */}
                         {/* ... (keep existing code) ... */}

                         {/* --- Submission Button --- */}
                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full /* ... rest of classes ... */">
                                {isSubmitting ? (
                                    <><RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Submitting...</>
                                ) : (
                                     isEditing ? 'Update Product' : 'Submit Product / Bundle'
                                )}
                            </button>
                        </div>
                    </form>
                 </div>

                {/* --- Loading Indicator --- */}
                {isLoading && <p className="text-center text-gray-600">Loading management sections...</p>}


                {/* --- Product Management List --- */}
                {!isLoading && (
                    <div className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Products</h2>
                        {products.length === 0 ? (
                             <p className="text-gray-500">No products found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (EGP)</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {products.map(product => (
                                            <tr key={product._id}>
                                                <td className="px-4 py-3 whitespace-nowrap"><img src={product.imagePaths?.[0] || './images/placeholder.jpg'} alt="" className="w-10 h-10 object-cover rounded"/></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{product.name_en || product.bundleName || product.name || 'N/A'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.productType}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.price_egp?.toFixed(2)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{product.status}</span></td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <button onClick={() => handleEditProduct(product)} title="Edit" className="text-indigo-600 hover:text-indigo-900"><Edit size={18}/></button>
                                                    <button onClick={() => handleDeleteProduct(product._id, product.name_en || product.bundleName || product.name)} title="Delete" className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
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
                {!isLoading && (
                    <div className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Orders</h2>
                        {orders.length === 0 ? (
                             <p className="text-gray-500">No orders found.</p>
                        ) : (
                             <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (EGP)</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.map(order => (
                                            <tr key={order._id}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 truncate" style={{maxWidth: '100px'}} title={order._id}>{order._id}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{order.customerInfo?.name || 'N/A'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{order.totalAmount?.toFixed(2)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                                        className={`p-1 rounded text-xs ${
                                                            order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                                                            order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
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
                                                     <button onClick={() => handleViewOrder(order)} title="View Details" className="text-gray-500 hover:text-indigo-600"><Eye size={18}/></button>
                                                 </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         )}
                    </div>
                )}

                 {/* --- Order Details Modal (Simple Popup) --- */}
                 {viewingOrder && (
                     <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50" onClick={closeOrderView}>
                        <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="text-lg font-medium text-gray-900">Order Details ({viewingOrder._id.slice(-6)})</h3>
                                <button onClick={closeOrderView} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                            </div>
                            <div className="mt-3 text-sm space-y-3">
                                <p><strong>Date:</strong> {new Date(viewingOrder.createdAt).toLocaleString()}</p>
                                <p><strong>Status:</strong> {viewingOrder.status}</p>
                                <p><strong>Customer:</strong> {viewingOrder.customerInfo.name}</p>
                                <p><strong>Email:</strong> {viewingOrder.customerInfo.email}</p>
                                <p><strong>Phone:</strong> {viewingOrder.customerInfo.phone}</p>
                                <p><strong>Address:</strong> {viewingOrder.customerInfo.address}, {viewingOrder.customerInfo.city}</p>
                                {viewingOrder.customerInfo.notes && <p><strong>Notes:</strong> {viewingOrder.customerInfo.notes}</p>}
                                <p><strong>Payment:</strong> {viewingOrder.paymentMethod}</p>
                                <hr/>
                                <p><strong>Items:</strong></p>
                                <ul className="list-disc list-inside space-y-1">
                                    {viewingOrder.items.map((item, index) => (
                                        <li key={index}>
                                            {item.name} x {item.quantity} @ {item.price?.toFixed(2)} EGP
                                            {item.customization && item.customization.length > 0 && ` (${item.customization.join(', ')})`}
                                        </li>
                                    ))}
                                </ul>
                                <hr/>
                                <p><strong>Subtotal:</strong> {viewingOrder.subtotal?.toFixed(2)} EGP</p>
                                <p><strong>Shipping:</strong> {viewingOrder.shippingFee?.toFixed(2)} EGP</p>
                                <p><strong>Total:</strong> {viewingOrder.totalAmount?.toFixed(2)} EGP</p>
                            </div>
                            <div className="mt-4 text-right">
                                <button onClick={closeOrderView} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Close</button>
                            </div>
                        </div>
                    </div>
                 )}

            </div> {/* End Max Width Container */}
        </div> // End Main Div
    );
}
