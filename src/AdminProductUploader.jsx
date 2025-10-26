import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Zap, Package, X, Plus, Edit, Trash2, Eye } from 'lucide-react'; // Added Edit, Trash2, Eye icons

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

    // --- Basic Form Input Handlers (Unchanged) ---
    const handleChange = useCallback((e) => { /* Your existing code */ }, []);
    const handlePriceChange = useCallback((e) => { /* Your existing code */ }, []);
    const handleStockChange = useCallback((e) => { /* Your existing code */ }, []);

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

    // --- Image Handlers (Unchanged) ---
    const handleFileChange = useCallback((e) => { /* Your existing code */ }, []);
    const removeFile = useCallback((index) => { /* Your existing code */ }, []);
    // Note: Add removeExistingImage function here if you implement that feature

    // --- Bundle Item Handlers (Unchanged) ---
    const handleBundleItemChange = useCallback((index, field, value) => { /* Your existing code */ }, []);
    const addBundleItem = useCallback(() => { /* Your existing code */ }, [formData.bundleItems.length]);
    const removeBundleItem = useCallback((index) => { /* Your existing code */ }, []);

    // --- Main Submit Handler (Handles BOTH Create and Update) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        // 1. Validation
        if (!isEditing && formData.selectedFiles.length === 0) { /* ... keep validation ... */ return; }
        if (!formData.category) { /* ... keep validation ... */ return; }
        // Add other required field validations as needed...

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
            // ... (delete other single-only fields if necessary) ...
        }

        // 3. Create FormData for multipart submission
        const data = new FormData();
        // Append any NEW files selected by the user
        formData.selectedFiles.forEach(file => { data.append('productImages', file); });
        // Append the text data as a JSON string
        data.append('productData', JSON.stringify(productDetails));
        // Note: For updates, the backend's updateProduct function needs to handle combining
        // existing imagePaths with newly uploaded files if needed.

        // 4. Determine API endpoint and method
        const url = isEditing ? `${API_BASE_URL}/api/products/${formData._id}` : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        // 5. Make API Call
        try {
            const response = await fetch(url, { method, body: data });
            const result = await response.json();

            if (response.ok && result.success) { // Check for success flag from backend
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
        // Scroll to the form section for better UX
        const formElement = document.getElementById('product-form-section');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Delete Product Logic ---
    const handleDeleteProduct = async (productId, productName) => {
        if (!window.confirm(`Are you sure you want to delete "${productName}"? This cannot be undone.`)) return;

        setIsSubmitting(true); // Provide visual feedback
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, { method: 'DELETE' });
            const result = await response.json();
            if (response.ok && result.success) {
                setMessage(`Success! Product "${productName}" deleted.`);
                await fetchProducts(); // Refresh the product list
                 if (formData._id === productId) resetForm(); // If deleting the product currently being edited, reset form
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
        // Confirmation dialog
        if (!window.confirm(`Update order ${orderId.slice(-6)} status to "${newStatus}"?`)) return;

        // Use isSubmitting for loading state on order actions too
        setIsSubmitting(true);
        // Clear product form message or use a dedicated state for order messages
        // setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (response.ok && result.order) { // Check for order object in response
                // Consider a temporary success message specific to orders
                console.log(`Order ${orderId.slice(-6)} status updated.`);
                await fetchOrders(); // Refresh the order list
            } else {
                setMessage(`Error updating order: ${result.message || result.error || `Status ${response.status}`}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}.`);
            console.error('Order Update Error:', error);
        } finally {
            setIsSubmitting(false); // Release loading state
        }
    };
    const handleViewOrder = (order) => setViewingOrder(order);
    const closeOrderView = () => setViewingOrder(null);

    // --- Render Logic ---
    const isBundle = formData.productType === 'Bundle';

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
            {/* Tailwind script/CDN link should be in the main HTML file (admin-upload.html) */}
            {/* Font link can also be in the main HTML file */}

            <div className="max-w-7xl mx-auto space-y-12"> {/* Increased max-width for better layout */}

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
                        {isEditing ? `Updating product ID: ...${formData._id?.slice(-6)}. Upload images to ADD to existing.` : 'Define core properties, bundle items if applicable.'}
                    </p>

                    {/* Global Message Area */}
                    {message && (
                        <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                            {message}
                        </div>
                    )}

                    {/* --- THE FORM --- */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* --- Product Type Toggle --- */}
                        <fieldset className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                             <legend className="block text-lg font-semibold text-indigo-800 mb-3">
                                <Package className="w-5 h-5 inline mr-2 align-text-bottom" /> Product Type
                             </legend>
                            <div className="flex flex-wrap gap-4"> {/* Use gap for spacing */}
                                {/* ... Radio buttons for Single/Bundle (Your existing JSX is fine) ... */}
                            </div>
                        </fieldset>

                        {/* --- Core Details Section --- */}
                        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t pt-6">
                            <legend className="md:col-span-2 text-xl font-bold text-gray-800 mb-4"> General Details </legend>
                            {/* Name Input (Conditional based on isBundle) */}
                             {/* ... Your existing conditional name input JSX ... */}
                            {/* Category Select */}
                             {/* ... Your existing category select JSX ... */}
                            {/* Featured Checkbox */}
                             {/* ... Your existing featured checkbox JSX ... */}
                            {/* Status Select */}
                             {/* ... Your existing status select JSX ... */}
                             {/* Price Input */}
                             {/* ... Your existing price input JSX ... */}
                             {/* Stock Input */}
                             {/* ... Your existing stock input JSX ... */}
                             {/* Size Input (Conditional) */}
                             {/* ... Your existing conditional size input JSX ... */}
                             {/* Scents Input (Conditional) */}
                             {/* ... Your existing conditional scents input JSX ... */}
                        </fieldset>

                        {/* --- Specifications Section (Conditional) --- */}
                        {!isBundle && (
                             <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 border-t pt-6">
                                <legend className="md:col-span-3 text-xl font-bold text-gray-800 mb-4"> Product Specifications </legend>
                                {/* Burn Time Input */}
                                {/* ... Your existing burnTime input JSX ... */}
                                {/* Wick Type Input */}
                                {/* ... Your existing wickType input JSX ... */}
                                {/* Coverage Space Input */}
                                {/* ... Your existing coverageSpace input JSX ... */}
                             </fieldset>
                        )}

                        {/* --- Descriptions Section --- */}
                        <fieldset className="space-y-4 border-t pt-6">
                            <legend className="text-xl font-bold text-gray-800 mb-4"> Description </legend>
                            {/* Short Description (Conditional) */}
                             {/* ... Your existing conditional description textareas JSX ... */}
                             {/* Formatted Description (Conditional) */}
                             {/* ... Your existing conditional formattedDescription textarea JSX ... */}
                        </fieldset>

                        {/* --- Image Uploads Section --- */}
                        <fieldset className="border-t pt-6">
                            <legend className="text-xl font-bold text-gray-800 mb-4">
                                Images (Max 5 total) {!isEditing && <span className="text-red-500">* Required for new</span>}
                            </legend>
                            {/* Display existing images when editing */}
                           {/* Display existing images when editing */}
                            {isEditing && formData.imagePaths && formData.imagePaths.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Current Images:</p>
                                    <div className="flex flex-wrap gap-3">
                                        {/* Map over the imagePaths array and display each image */}
                                        {formData.imagePaths.map((url, index) => (
                                            <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={url} alt={`Current ${index + 1}`} className="w-full h-full object-cover"/>
                                                {/* Optional: Add a button here if you want to allow deleting existing images */}
                                                {/* <button type="button" onClick={() => removeExistingImage(index)} className="absolute top-0 right-0 p-1 ..."><X size={12}/></button> */}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Upload new images below to add more (up to 5 total).</p>
                                </div>
                            )}
                            {/* File Input (Keep this) */}
                             <input
                                type="file"
                                id="file-upload"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {/* ... rest of the image upload section ... */}
                            {/* File Input */}
                             <input type="file" id="file-upload" /* ... */ />
                            <p className="mt-2 text-xs text-gray-500"> High-res JPG/PNG recommended. </p>
                            {/* New File Previews */}
                            <div className="mt-4 flex flex-wrap gap-3">
                                {/* ... JSX for previewing selectedFiles ... */}
                            </div>
                        </fieldset>

                        {/* --- Bundle Items Section (Conditional) --- */}
                        {isBundle && (
                            <fieldset className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 space-y-6">
                                <legend className="text-xl font-bold text-yellow-800 flex items-center">
                                    <Package className="w-5 h-5 mr-2" /> Bundle Items (Up to 10)
                                </legend>
                                {/* ... Your existing bundle items map and Add button JSX ... */}
                            </fieldset>
                        )}

                        {/* --- Submission Button --- */}
                        <div className="pt-6 border-t">
                            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out">
                                {/* ... Submit button text/icon logic ... */}
                            </button>
                        </div>
                    </form>
                    {/* ======================================================= */}
                    {/* ========= END OF RESTORED FORM JSX ================== */}
                    {/* ======================================================= */}
                </div>

                {/* --- Loading Indicator for Lists --- */}
                {isLoadingData && <p className="text-center text-gray-600 py-10">Loading management sections...</p>}

                {/* --- Product Management List --- */}
                {!isLoadingData && (
                    <div id="product-list-section" className="bg-white shadow-xl rounded-2xl p-6 md:p-10">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Products</h2>
                        {products.length === 0 ? ( <p className="text-gray-500">No products found.</p> ) : (
                            <div className="overflow-x-auto">
                                {/* Product Table JSX (Your existing table code is fine here) */}
                                {/* Make sure Edit/Delete buttons call handleEditProduct / handleDeleteProduct */}
                                <table className="min-w-full divide-y divide-gray-200">
                                   {/* ... table head ... */}
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {products.map(product => (
                                            <tr key={product._id}>
                                                {/* ... table cells for image, name, type, price, stock, status ... */}
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
                         {orders.length === 0 ? ( <p className="text-gray-500">No orders found.</p> ) : (
                             <div className="overflow-x-auto">
                                 {/* Order Table JSX (Your existing table code is fine here) */}
                                 {/* Make sure status dropdown calls handleUpdateOrderStatus */}
                                 {/* Make sure view button calls handleViewOrder */}
                                 <table className="min-w-full divide-y divide-gray-200">
                                     {/* ... table head ... */}
                                     <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.map(order => (
                                             <tr key={order._id}>
                                                {/* ... table cells for id, date, customer, total ... */}
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    {/* Status Dropdown (Your existing select code is good) */}
                                                     <select value={order.status} onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)} /* ... className/disabled logic ... */ >
                                                         {/* ... options ... */}
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

                {/* --- Order Details Modal (Keep your existing modal structure) --- */}
                {/* --- Order Details Modal (Keep your existing modal structure) --- */}
                {viewingOrder && (
                     <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50" onClick={closeOrderView}>
                        <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
                            {/* ... (Your existing Order Modal content goes here) ... */}
                             <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="text-lg font-medium text-gray-900">Order Details ({viewingOrder._id.slice(-6)})</h3>
                                <button onClick={closeOrderView} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                            </div>
                            <div className="mt-3 text-sm space-y-3">
                                {/* ... all the <p> tags for details ... */}
                                 <p><strong>Date:</strong> {new Date(viewingOrder.createdAt).toLocaleString()}</p>
                                 {/* ... etc ... */}
                                <p><strong>Total:</strong> {viewingOrder.totalAmount?.toFixed(2)} EGP</p>
                             </div>
                            <div className="mt-4 text-right">
                                <button onClick={closeOrderView} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Close</button>
                             </div>
                        </div>
                    </div>
                 )}

            </div> {/* <<< THIS Closes the "max-w-7xl mx-auto space-y-12" div >>> */}
        </div> // <<< THIS Closes the main "min-h-screen bg-gray-100..." div >>>
    ); // <<< THIS Closes the return statement's parenthesis >>>
}; // <<< THIS Closes the AdminProductUploader component function >>>