import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Zap, Package, X, Plus, Edit, Trash2, Link, Search } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropUtils';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const initialBundleItem = {
    subProductName: 'Item',
    size: '',
    allowedScents: ['Vanilla Cookie'],
    linkedProductId: null,      // ← NEW: links to a real product
    linkedProductName: '',      // ← NEW: display name of linked product
};

const initialVariant = {
    variantName: '',
    variantType: 'weight',
    price: 0,
    stock: 0,
    sku: ''
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
    scents: [],
    size: '',
    burnTime: '',
    wickType: '',
    coverageSpace: '',
    bundleName: '',
    bundleDescription: '',
    bundlePrice: 0,         // ← NEW: manually set final bundle price
    bundleItems: [
        { ...initialBundleItem, subProductName: 'Item 1' },
        { ...initialBundleItem, subProductName: 'Item 2' },
        { ...initialBundleItem, subProductName: 'Item 3' },
    ],
    selectedFiles: [],
    imagePaths: [],
    weight: '',
    skinType: '',
    featureBenefit: '',
    color: '',
    dimensions: '',
    soapWeight: '',
    oilWeight: '',
    massageWeight: '',
    fizzySpecs: '',
    scentOptions: [],
    sizeOptions: [],
    weightOptions: [],
    typeOptions: [],
    shapeOptions: [],
    keyIngredients: [],
    variants: [],
};

const ProductManager = () => {
    const [formData, setFormData] = useState(initialProductState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [products, setProducts] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // ── Dynamic Categories ──────────────────────────────────────────────────
    const [categories, setCategories] = useState([]);

    // ── Product Search for Bundle Linking ───────────────────────────────────
    const [productSearch, setProductSearch] = useState({});   // { slotIndex: searchText }
    const [searchResults, setSearchResults] = useState({});   // { slotIndex: [products] }
    const [searchLoading, setSearchLoading] = useState({});

    // ── Cropper ─────────────────────────────────────────────────────────────
    const [cropImage, setCropImage] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // ── Fetch categories dynamically ─────────────────────────────────────────
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data.sort((a, b) => a.sortOrder - b.sortOrder));
            }
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/products?limit=1000`);
            if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
            const data = await response.json();
            setProducts(data.results || []);
        } catch (error) {
            setMessage(`Error: Could not load products. ${error.message}`);
            setProducts([]);
        }
    }, []);

    useEffect(() => {
        setIsLoadingData(true);
        Promise.all([fetchProducts(), fetchCategories()]).finally(() => setIsLoadingData(false));
    }, [fetchProducts, fetchCategories]);

    // ── Bundle original price auto-calc ──────────────────────────────────────
    const bundleOriginalPrice = formData.bundleItems.reduce((sum, item) => {
        const linked = products.find(p => p._id === item.linkedProductId);
        if (!linked) return sum;
        const price = linked.variants?.length > 0
            ? Math.min(...linked.variants.map(v => v.price))
            : (linked.price_egp || 0);
        return sum + price;
    }, 0);

    const bundleSaving = bundleOriginalPrice > 0
        ? bundleOriginalPrice - (formData.bundlePrice || 0)
        : 0;

    const bundleDiscountPct = bundleOriginalPrice > 0 && bundleSaving > 0
        ? Math.round((bundleSaving / bundleOriginalPrice) * 100)
        : 0;

    // ── Cropper helpers ──────────────────────────────────────────────────────
    const readFile = (file) => new Promise(resolve => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result));
        reader.readAsDataURL(file);
    });

    const onCropComplete = useCallback((_, cap) => setCroppedAreaPixels(cap), []);

    const showCroppedImage = useCallback(async () => {
        try {
            const blob = await getCroppedImg(cropImage, croppedAreaPixels);
            const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFormData(prev => {
                if ((prev.selectedFiles || []).length >= 5) { alert('Max 5 images.'); return prev; }
                return { ...prev, selectedFiles: [...prev.selectedFiles, file] };
            });
            setIsCropping(false); setCropImage(null); setZoom(1);
        } catch (e) { setMessage('Error cropping image'); }
    }, [cropImage, croppedAreaPixels]);

    const handleFileChange = async (e) => {
        if (e.target.files?.[0]) {
            const url = await readFile(e.target.files[0]);
            setCropImage(url); setIsCropping(true);
            e.target.value = null;
        }
    };

    // ── Form helpers ─────────────────────────────────────────────────────────
    const resetForm = useCallback(() => {
        setFormData(initialProductState);
        setIsEditing(false);
        setProductSearch({}); setSearchResults({});
        const fi = document.getElementById('file-upload');
        if (fi) fi.value = null;
        setMessage('');
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }, []);

    const handlePriceChange = useCallback((e) => {
        setFormData(prev => ({ ...prev, price_egp: parseFloat(e.target.value) || 0 }));
    }, []);

    const handleStockChange = useCallback((e) => {
        setFormData(prev => ({ ...prev, stock: parseInt(e.target.value, 10) || 0 }));
    }, []);

    const handleArrayChange = useCallback((fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value.split(',').map(s => s.trim()).filter(Boolean) }));
    }, []);

    const handleScentsChange = useCallback((e) => {
        setFormData(prev => ({ ...prev, scents: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }));
    }, []);

    const removeFile = useCallback((i) => {
        setFormData(prev => ({ ...prev, selectedFiles: prev.selectedFiles.filter((_, idx) => idx !== i) }));
    }, []);

    const removeExistingImage = useCallback((i) => {
        setFormData(prev => ({ ...prev, imagePaths: prev.imagePaths.filter((_, idx) => idx !== i) }));
    }, []);

    // ── Bundle helpers ───────────────────────────────────────────────────────
    const handleBundleItemChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const items = [...prev.bundleItems];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, bundleItems: items };
        });
    }, []);

    const handleBundleScentsChange = useCallback((index, value) => {
        setFormData(prev => {
            const items = [...prev.bundleItems];
            items[index].allowedScents = value.split(',').map(s => s.trim()).filter(Boolean);
            return { ...prev, bundleItems: items };
        });
    }, []);

    const addBundleItem = useCallback(() => {
        if (formData.bundleItems.length < 10) {
            setFormData(prev => ({
                ...prev,
                bundleItems: [...prev.bundleItems, { ...initialBundleItem, subProductName: `Item ${prev.bundleItems.length + 1}` }]
            }));
        }
    }, [formData.bundleItems.length]);

    const removeBundleItem = useCallback((i) => {
        if (formData.bundleItems.length > 1) {
            setFormData(prev => ({ ...prev, bundleItems: prev.bundleItems.filter((_, idx) => idx !== i) }));
        }
    }, [formData.bundleItems.length]);

    // ── Bundle product search & link ─────────────────────────────────────────
    const handleProductSearch = async (slotIndex, query) => {
        setProductSearch(prev => ({ ...prev, [slotIndex]: query }));
        if (!query || query.length < 2) {
            setSearchResults(prev => ({ ...prev, [slotIndex]: [] }));
            return;
        }
        setSearchLoading(prev => ({ ...prev, [slotIndex]: true }));
        try {
            const res = await fetch(`${API_BASE_URL}/api/products?limit=20&search=${encodeURIComponent(query)}&productType=Single`);
            const data = await res.json();
            setSearchResults(prev => ({ ...prev, [slotIndex]: data.results || [] }));
        } catch (e) {
            console.error(e);
        } finally {
            setSearchLoading(prev => ({ ...prev, [slotIndex]: false }));
        }
    };

    const linkProductToSlot = (slotIndex, product) => {
        // Auto-populate scents from the linked product's variants
        const scents = (product.variants || [])
            .filter(v => v.variantType === 'scent')
            .map(v => v.variantName);

        const allowedScents = scents.length > 0
            ? scents
            : (product.scents || '').split(',').map(s => s.trim()).filter(Boolean);

        setFormData(prev => {
            const items = [...prev.bundleItems];
            items[slotIndex] = {
                ...items[slotIndex],
                linkedProductId: product._id,
                linkedProductName: product.name_en || product.bundleName || product.name || '',
                subProductName: items[slotIndex].subProductName || product.name_en || '',
                allowedScents: allowedScents.length > 0 ? allowedScents : items[slotIndex].allowedScents,
            };
            return { ...prev, bundleItems: items };
        });
        setSearchResults(prev => ({ ...prev, [slotIndex]: [] }));
        setProductSearch(prev => ({ ...prev, [slotIndex]: '' }));
    };

    const unlinkProduct = (slotIndex) => {
        setFormData(prev => {
            const items = [...prev.bundleItems];
            items[slotIndex] = { ...items[slotIndex], linkedProductId: null, linkedProductName: '' };
            return { ...prev, bundleItems: items };
        });
    };

    // ── Variants ─────────────────────────────────────────────────────────────
    const handleVariantChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const v = [...prev.variants];
            v[index] = { ...v[index], [field]: value };
            return { ...prev, variants: v };
        });
    }, []);

    const addVariant = useCallback(() => {
        setFormData(prev => ({ ...prev, variants: [...prev.variants, { ...initialVariant }] }));
    }, []);

    const removeVariant = useCallback((i) => {
        setFormData(prev => ({ ...prev, variants: prev.variants.filter((_, idx) => idx !== i) }));
    }, []);

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true); setMessage('');

        if (!isEditing && formData.selectedFiles.length === 0) {
            setMessage('Error: Please upload at least one image.'); setIsSubmitting(false); return;
        }
        if (!formData.category) {
            setMessage('Error: Category is required.'); setIsSubmitting(false); return;
        }

        let productDetails = {
            productType: formData.productType,
            category: formData.category,
            price_egp: formData.price_egp,
            stock: formData.stock,
            status: formData.status,
            featured: formData.featured,
            description_en: formData.description_en,
            size: formData.size,
            burnTime: formData.burnTime,
            wickType: formData.wickType,
            coverageSpace: formData.coverageSpace,
            weight: formData.weight,
            skinType: formData.skinType,
            featureBenefit: formData.featureBenefit,
            color: formData.color,
            dimensions: formData.dimensions,
            soapWeight: formData.soapWeight,
            oilWeight: formData.oilWeight,
            massageWeight: formData.massageWeight,
            fizzySpecs: formData.fizzySpecs,
            scents: formData.scents.join(', '),
            scentOptions: formData.scentOptions.join(', '),
            sizeOptions: formData.sizeOptions.join(', '),
            weightOptions: formData.weightOptions.join(', '),
            typeOptions: formData.typeOptions.join(', '),
            shapeOptions: formData.shapeOptions.join(', '),
            keyIngredients: formData.keyIngredients.join(', '),
            variants: formData.variants,
        };

        if (formData.productType === 'Single') {
            productDetails.name_en = formData.name_en;
        } else {
            // Bundle
            productDetails.bundleName = formData.bundleName;
            productDetails.bundleDescription = formData.bundleDescription;
            productDetails.bundlePrice = parseFloat(formData.bundlePrice) || 0;
            productDetails.bundleOriginalPrice = bundleOriginalPrice;  // auto-calc
            productDetails.bundleItems = formData.bundleItems.map(item => ({
                subProductName: item.subProductName,
                size: item.size,
                allowedScents: Array.isArray(item.allowedScents)
                    ? item.allowedScents.join(', ')
                    : item.allowedScents,
                linkedProductId: item.linkedProductId || null,
                linkedProductName: item.linkedProductName || '',
            }));
            // Remove single-product-only fields
            ['name_en', 'scents', 'size', 'burnTime', 'wickType', 'coverageSpace',
             'weight', 'skinType', 'featureBenefit', 'color', 'scentOptions',
             'sizeOptions', 'weightOptions', 'typeOptions', 'shapeOptions',
             'keyIngredients', 'dimensions', 'soapWeight', 'oilWeight',
             'massageWeight', 'fizzySpecs', 'variants'].forEach(f => delete productDetails[f]);
        }

        const data = new FormData();
        formData.selectedFiles.forEach(file => data.append('productImages', file));
        data.append('productData', JSON.stringify(productDetails));

        const url = isEditing ? `${API_BASE_URL}/api/products/${formData._id}` : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, body: data });
            const result = await response.json();
            if (response.ok && result.success) {
                const name = result.product?.name_en || result.product?.bundleName || 'product';
                setMessage(`✅ "${name}" ${isEditing ? 'updated' : 'created'} successfully!`);
                resetForm(); await fetchProducts();
            } else {
                setMessage(`Error: ${result.message || result.error || `Status ${response.status}`}`);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Edit product ─────────────────────────────────────────────────────────
    const handleEditProduct = (p) => {
        const arrayFields = ['scents', 'scentOptions', 'sizeOptions', 'weightOptions', 'typeOptions', 'shapeOptions', 'keyIngredients'];
        const processed = { ...p };
        arrayFields.forEach(f => {
            processed[f] = (p[f] || '').split(',').map(s => s.trim()).filter(Boolean);
        });
        const bundleItemsFormatted = (p.bundleItems || []).map(item => ({
            ...item,
            allowedScents: typeof item.allowedScents === 'string'
                ? item.allowedScents.split(',').map(s => s.trim()).filter(Boolean)
                : (item.allowedScents || []),
            linkedProductId: item.linkedProductId || null,
            linkedProductName: item.linkedProductName || '',
        }));
        setFormData({
            ...initialProductState,
            ...processed,
            _id: p._id,
            bundleItems: bundleItemsFormatted.length > 0 ? bundleItemsFormatted : initialProductState.bundleItems,
            selectedFiles: [],
            imagePaths: p.imagePaths || [],
            variants: p.variants || [],
            bundlePrice: p.bundlePrice || p.price_egp || 0,
        });
        setIsEditing(true);
        setMessage('Editing product. Upload images only to ADD new ones.');
    };

    const handleDeleteProduct = async (productId, productName) => {
        if (!window.confirm(`Delete "${productName}"? This cannot be undone.`)) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, { method: 'DELETE' });
            const result = await response.json();
            if (response.ok && result.success) {
                setMessage(`✅ "${productName}" deleted.`);
                await fetchProducts();
                if (formData._id === productId) resetForm();
            } else {
                setMessage(`Error: ${result.message || `Status ${response.status}`}`);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isBundle = formData.productType === 'Bundle';

    // ── Category-specific fields (unchanged from original) ───────────────────
    const renderCategorySpecificFields = () => {
        const { category } = formData;
        if (isBundle || !category) return (
            <div className="md:col-span-3 text-center text-gray-500 italic p-4">
                {isBundle ? 'Specifications are defined per bundle item.' : 'Select a category to see specific options.'}
            </div>
        );

        switch (category) {
            case 'Candles':
            case 'Pottery Collection':
                return (<>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Burn Time</label><input type="text" name="burnTime" value={formData.burnTime} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 40-45 hours"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Wick Type</label><input type="text" name="wickType" value={formData.wickType} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Cotton"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Coverage Space</label><input type="text" name="coverageSpace" value={formData.coverageSpace} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 15-20 m²"/></div>
                    <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Scent Options (comma-separated)</label><input type="text" value={formData.scentOptions.join(', ')} onChange={e => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla, Rose, Oud"/><p className="mt-1 text-xs text-gray-500">Customer chooses from these as a dropdown</p></div>
                </>);
            case 'Car Diffusers':
            case 'Body Splash':
            case 'Fresheners':
            case 'Wax Melts':
            case 'Reed Diffusers':
                return (<>
                    <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Scent Options — with individual stock (use Variants below)</label><p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">💡 For per-scent stock tracking, add each scent as a Variant below with type "Scent" and its own stock number.</p></div>
                    <div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Or: Simple Scent List (no individual stock)</label><input type="text" value={formData.scentOptions.join(', ')} onChange={e => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Apple, Rose, Vanilla, Musk"/></div>
                </>);
            case 'Deodorant':
                return (<>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Skin Type</label><input type="text" name="skinType" value={formData.skinType} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Key Ingredients</label><input type="text" value={formData.keyIngredients.join(', ')} onChange={e => handleArrayChange('keyIngredients', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/></div>
                </>);
            case 'Soap':
                return (<>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Soap Weight</label><input type="text" name="soapWeight" value={formData.soapWeight} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Feature / Benefit</label><input type="text" name="featureBenefit" value={formData.featureBenefit} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Key Ingredients</label><input type="text" value={formData.keyIngredients.join(', ')} onChange={e => handleArrayChange('keyIngredients', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/></div>
                </>);
            default:
                return (<div className="md:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Scent / Options (comma-separated)</label><input type="text" value={formData.scentOptions.join(', ')} onChange={e => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Rose, Vanilla"/></div>);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Cropper overlay */}
            {isCropping && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-lg h-80 bg-gray-800 rounded-lg overflow-hidden">
                        <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={4/5} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom}/>
                    </div>
                    <div className="mt-6 flex flex-col w-full max-w-lg gap-4 bg-white p-4 rounded-lg shadow-lg">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-gray-700 min-w-[40px]">Zoom</span>
                            <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={e => setZoom(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                        <div className="flex gap-3 justify-end mt-2">
                            <button onClick={() => { setIsCropping(false); setCropImage(null); }} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={showCroppedImage} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-md">Done & Save</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                        <Zap className="w-6 h-6 mr-2 text-indigo-600"/>
                        {isEditing ? 'Edit Product' : 'Add New Product'}
                    </h1>
                    {isEditing && (
                        <button onClick={resetForm} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1 border border-indigo-200 rounded hover:bg-indigo-50">
                            Cancel Edit / Add New
                        </button>
                    )}
                </div>

                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Product Type */}
                    <fieldset className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                        <legend className="block text-lg font-semibold text-indigo-800 mb-3">
                            <Package className="w-5 h-5 inline mr-2 align-text-bottom"/> Product Type
                        </legend>
                        <div className="flex flex-wrap gap-4">
                            {['Single', 'Bundle'].map(type => (
                                <label key={type} className="flex items-center cursor-pointer bg-white p-3 rounded-xl shadow-sm transition hover:shadow-md">
                                    <input type="radio" name="productType" value={type} checked={formData.productType === type} onChange={handleChange} className="h-5 w-5 text-indigo-600"/>
                                    <span className="ml-2 font-medium text-gray-700">{type === 'Single' ? 'Single Product' : 'Product Bundle'}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* General Details */}
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t pt-6">
                        <legend className="md:col-span-2 text-xl font-bold text-gray-800 mb-4">General Details</legend>

                        {/* Name */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isBundle ? 'Bundle Name' : 'Name (English)'} <span className="text-red-500">*</span>
                            </label>
                            <input type="text" name={isBundle ? 'bundleName' : 'name_en'} value={isBundle ? formData.bundleName : formData.name_en} onChange={handleChange} required className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                        </div>

                        {/* ── DYNAMIC CATEGORY DROPDOWN ── */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                            <select name="category" value={formData.category} onChange={handleChange} required className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                            {categories.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">⚠️ No categories loaded — check your Categories tab</p>
                            )}
                        </div>

                        <div className="md:col-span-2 flex items-center gap-x-3 pt-1">
                            <input type="checkbox" name="featured" id="featured" checked={formData.featured} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                            <label htmlFor="featured" className="block text-sm font-medium text-gray-700">Featured Product (Show on Homepage)</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                <option value="Active">Active (Visible on site)</option>
                                <option value="Inactive">Inactive (Hidden from site)</option>
                            </select>
                        </div>

                        {/* Price — different for bundle vs single */}
                        {isBundle ? (
                            <div className="md:col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Final Price (EGP) <span className="text-red-500">*</span></label>
                                        <input type="number" name="bundlePrice" value={formData.bundlePrice} onChange={e => setFormData(p => ({ ...p, bundlePrice: parseFloat(e.target.value) || 0 }))} required min="0" step="0.01" className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"/>
                                        <p className="text-xs text-gray-500 mt-1">What customer pays</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (auto)</label>
                                        <div className="p-3 bg-white border rounded-lg text-gray-600 font-mono">
                                            {bundleOriginalPrice > 0 ? `${bundleOriginalPrice.toFixed(2)} EGP` : '— link products below'}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Sum of component prices</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Saves</label>
                                        <div className={`p-3 rounded-lg font-mono font-bold ${bundleSaving > 0 ? 'bg-green-100 text-green-700' : 'bg-white border text-gray-400'}`}>
                                            {bundleSaving > 0 ? `${bundleSaving.toFixed(2)} EGP (${bundleDiscountPct}% off)` : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (EGP) <span className="text-red-500">*</span></label>
                                    <input type="number" value={formData.price_egp} onChange={handlePriceChange} required min="0" step="0.01" className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"/>
                                    <p className="text-xs text-gray-500 mt-1">Used if no variants are added</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Stock <span className="text-red-500">*</span></label>
                                    <input type="number" value={formData.stock} onChange={handleStockChange} required min="0" className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500"/>
                                    <p className="text-xs text-gray-500 mt-1">Used if no variants are added</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                                    <input type="text" name="size" value={formData.size} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-indigo-500" placeholder='e.g., "200 gm"'/>
                                </div>
                            </>
                        )}

                        <div className="col-span-1 md:col-span-2 mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea name={isBundle ? 'bundleDescription' : 'description_en'} value={isBundle ? formData.bundleDescription : formData.description_en} onChange={handleChange} rows="3" className="block w-full rounded-lg border p-3 focus:border-indigo-500" placeholder="Write a description..."/>
                        </div>
                    </fieldset>

                    {/* Variants (single products only) */}
                    {!isBundle && (
                        <fieldset className="bg-green-50 p-6 rounded-xl border border-green-200 space-y-4">
                            <legend className="text-xl font-bold text-green-800 flex items-center">
                                <Package className="w-5 h-5 mr-2"/> Product Variants & Stock per Scent
                            </legend>
                            <p className="text-sm text-green-700">Add each scent/size/weight as a variant with its own price and stock. When a variant's stock = 0, it shows as Sold Out on the site.</p>
                            {formData.variants.map((variant, index) => (
                                <div key={index} className="p-4 border border-green-300 rounded-lg bg-white">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-gray-800">Variant #{index + 1}</h3>
                                        <button type="button" onClick={() => removeVariant(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"><X className="w-4 h-4"/></button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Name (e.g. Apple, 100g)</label>
                                            <input type="text" value={variant.variantName} onChange={e => handleVariantChange(index, 'variantName', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500" placeholder="e.g., Apple"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                            <select value={variant.variantType} onChange={e => handleVariantChange(index, 'variantType', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border">
                                                <option value="scent">Scent</option>
                                                <option value="weight">Weight</option>
                                                <option value="size">Size</option>
                                                <option value="color">Color</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Price (EGP)</label>
                                            <input type="number" value={variant.price} onChange={e => handleVariantChange(index, 'price', parseFloat(e.target.value) || 0)} className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border" min="0" step="0.01"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                                            <input type="number" value={variant.stock} onChange={e => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)} className={`block w-full rounded-md shadow-sm p-2 text-sm border ${variant.stock === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'}`} min="0"/>
                                            {variant.stock === 0 && <p className="text-xs text-red-500 mt-1">Will show as Sold Out</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addVariant} className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-green-400 text-sm font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200">
                                <Plus className="w-4 h-4 mr-1"/> Add Variant / Scent
                            </button>
                        </fieldset>
                    )}

                    {/* Specifications */}
                    <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 border-t pt-6">
                        <legend className="md:col-span-3 text-xl font-bold text-gray-800 mb-4">Product Specifications</legend>
                        {renderCategorySpecificFields()}
                    </fieldset>

                    {/* Images */}
                    <fieldset className="border-t pt-6">
                        <legend className="text-xl font-bold text-gray-800 mb-4">Images (Max 5) {!isEditing && <span className="text-red-500 text-base">*</span>}</legend>
                        <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} className="hidden"/>
                        <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200 mb-4 font-medium">
                            <Plus className="w-5 h-5 mr-2"/> Select & Crop Image
                        </label>
                        <div className="mt-2 flex flex-wrap gap-4">
                            {formData.imagePaths?.map((url, i) => (
                                <div key={`ex-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
                                    <img src={url} className="w-full h-full object-cover" alt="Product"/>
                                    <div className={`absolute bottom-0 left-0 right-0 text-white text-xs text-center p-1 ${i === 0 ? 'bg-indigo-600' : 'bg-black bg-opacity-50'}`}>{i === 0 ? 'Main' : 'Existing'}</div>
                                    <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X size={12}/></button>
                                </div>
                            ))}
                            {formData.selectedFiles.map((file, i) => (
                                <div key={`new-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-green-500">
                                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="New"/>
                                    <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X size={12}/></button>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Images forced to 4:5 ratio.</p>
                    </fieldset>

                    {/* ── BUNDLE ITEMS — with product linking ── */}
                    {isBundle && (
                        <fieldset className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 space-y-6">
                            <legend className="text-xl font-bold text-yellow-800 flex items-center">
                                <Package className="w-5 h-5 mr-2"/> Bundle Items (Up to 10)
                            </legend>
                            <p className="text-sm text-yellow-700">Link each slot to an existing product so stock is tracked automatically. Then customise the scent options the customer can choose from.</p>

                            {formData.bundleItems.map((item, index) => (
                                <div key={index} className="p-4 border border-yellow-300 rounded-lg bg-white shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold text-gray-800">Item #{index + 1}</h3>
                                        {formData.bundleItems.length > 1 && (
                                            <button type="button" onClick={() => removeBundleItem(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"><X className="w-4 h-4"/></button>
                                        )}
                                    </div>

                                    {/* Link to product */}
                                    <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                                        <label className="block text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                                            <Link size={12}/> Link to Existing Product (for stock tracking)
                                        </label>
                                        {item.linkedProductId ? (
                                            <div className="flex items-center justify-between bg-white border border-indigo-200 rounded-lg p-2">
                                                <span className="text-sm font-medium text-indigo-800">✅ {item.linkedProductName}</span>
                                                <button type="button" onClick={() => unlinkProduct(index)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">Unlink</button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <div className="flex items-center gap-2">
                                                    <Search size={14} className="text-gray-400"/>
                                                    <input
                                                        type="text"
                                                        value={productSearch[index] || ''}
                                                        onChange={e => handleProductSearch(index, e.target.value)}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500"
                                                        placeholder="Search product name to link..."
                                                    />
                                                </div>
                                                {searchLoading[index] && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
                                                {(searchResults[index] || []).length > 0 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                        {searchResults[index].map(p => (
                                                            <button
                                                                key={p._id}
                                                                type="button"
                                                                onClick={() => linkProductToSlot(index, p)}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b last:border-0"
                                                            >
                                                                <span className="font-medium">{p.name_en || p.bundleName}</span>
                                                                <span className="text-gray-400 ml-2 text-xs">{p.category}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">Optional — link for stock tracking. Leave blank if not needed.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Existing fields unchanged */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
                                            <input type="text" value={item.subProductName} onChange={e => handleBundleItemChange(index, 'subProductName', e.target.value)} required className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                                            <input type="text" value={item.size} onChange={e => handleBundleItemChange(index, 'size', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500" placeholder="e.g., 200 gm"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Allowed Options / Scents (comma separated)</label>
                                            <input type="text" value={item.allowedScents.join(', ')} onChange={e => handleBundleScentsChange(index, e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500" placeholder="e.g., Rose, Vanilla, Apple"/>
                                            {item.linkedProductId && <p className="text-xs text-indigo-500 mt-1">Auto-filled from linked product. Edit if needed.</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {formData.bundleItems.length < 10 && (
                                <button type="button" onClick={addBundleItem} className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-yellow-400 text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200">
                                    <Plus className="w-4 h-4 mr-1"/> Add Bundle Item
                                </button>
                            )}
                        </fieldset>
                    )}

                    {/* Submit */}
                    <div className="pt-6 border-t">
                        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                            {isSubmitting ? <><RefreshCw className="w-5 h-5 mr-3 animate-spin"/> Submitting...</> : (isEditing ? 'Update Product' : 'Submit Product / Bundle')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Product List */}
            {!isLoadingData && (
                <div className="bg-white shadow-xl rounded-2xl p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Products</h2>
                    {products.length === 0 ? (
                        <p className="text-gray-500">No products found.</p>
                    ) : (
                        <div className="overflow-x-auto shadow-md sm:rounded-lg">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3">Image</th>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Price (EGP)</th>
                                        <th className="px-4 py-3">Stock</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product._id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3"><img src={product.imagePaths?.[0] || 'https://placehold.co/40x40/cccccc/ffffff?text=?'} alt="" className="w-10 h-10 object-cover rounded"/></td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{product.name_en || product.bundleName || 'N/A'}</td>
                                            <td className="px-4 py-3 text-xs">{product.category}</td>
                                            <td className="px-4 py-3">{product.productType}</td>
                                            <td className="px-4 py-3">
                                                {product.bundlePrice ? (
                                                    <span>
                                                        <span className="line-through text-gray-400 text-xs mr-1">{product.bundleOriginalPrice?.toFixed(0)}</span>
                                                        <span className="font-bold text-green-700">{product.bundlePrice?.toFixed(0)}</span>
                                                    </span>
                                                ) : product.price_egp?.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {product.variants?.length > 0
                                                    ? <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{product.variants.length} variants</span>
                                                    : product.stock}
                                            </td>
                                            <td className="px-4 py-3"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{product.status}</span></td>
                                            <td className="px-4 py-3 whitespace-nowrap space-x-2">
                                                <button onClick={() => handleEditProduct(product)} className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"><Edit size={16}/></button>
                                                <button onClick={() => handleDeleteProduct(product._id, product.name_en || product.bundleName)} className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductManager;