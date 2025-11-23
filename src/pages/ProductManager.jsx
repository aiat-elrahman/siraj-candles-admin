import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Zap, Package, X, Plus, Edit, Trash2 } from 'lucide-react';
import Cropper from 'react-easy-crop'; // NEW: Import Library
import getCroppedImg from '../utils/cropUtils'; // NEW: Import Helper

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const initialBundleItem = {
    subProductName: 'Item',
    size: '',
    allowedScents: ['Vanilla Cookie'],
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
    scents: [],
    size: '',
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

    // --- NEW: CROPPER STATE ---
    const [cropImage, setCropImage] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    const fetchProducts = useCallback(async () => {
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/products?limit=1000&status=Active&status=Inactive`);
            if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
            const data = await response.json();
            setProducts(data.results || []);
        } catch (error) {
            console.error("Error fetching products:", error);
            setMessage(`Error: Could not load products. ${error.message}`);
            setProducts([]);
        }
    }, []);

    useEffect(() => {
        setIsLoadingData(true);
        fetchProducts().finally(() => setIsLoadingData(false));
    }, [fetchProducts]);

    // --- NEW: CROPPER HELPER FUNCTIONS ---
    const readFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result), false);
            reader.readAsDataURL(file);
        });
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = useCallback(async () => {
        try {
            const croppedImageBlob = await getCroppedImg(cropImage, croppedAreaPixels);
            const newFile = new File([croppedImageBlob], `cropped-${Date.now()}.jpg`, { type: "image/jpeg" });
            
            setFormData(prev => {
                const currentFiles = prev.selectedFiles || [];
                if(currentFiles.length >= 5) {
                    alert("Maximum 5 images allowed.");
                    return prev;
                }
                return {
                    ...prev,
                    selectedFiles: [...currentFiles, newFile]
                };
            });
            
            // Reset Cropper
            setIsCropping(false);
            setCropImage(null);
            setZoom(1);
        } catch (e) {
            console.error(e);
            setMessage('Error cropping image');
        }
    }, [cropImage, croppedAreaPixels]);

    // Modified File Change Handler
    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setCropImage(imageDataUrl);
            setIsCropping(true);
            // Reset input so the same file can be selected again if needed
            e.target.value = null;
        }
    };

    const resetForm = useCallback(() => {
        setFormData(initialProductState);
        setIsEditing(false);
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = null;
        setMessage('');
    }, []);

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

    const handleArrayChange = useCallback((fieldName, value) => {
        const newArray = value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, [fieldName]: newArray }));
    }, []);

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

    // Standard removeFile (removes from selectedFiles array)
    const removeFile = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
        }));
    }, []);

    const handleBundleItemChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const newBundleItems = [...prev.bundleItems];
            newBundleItems[index][field] = value;
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
        if (formData.bundleItems.length > 1) {
            setFormData(prev => ({
                ...prev,
                bundleItems: prev.bundleItems.filter((_, i) => i !== index),
            }));
        }
    }, [formData.bundleItems.length]);

    const handleVariantChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            newVariants[index][field] = value;
            return { ...prev, variants: newVariants };
        });
    }, []);

    const addVariant = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { ...initialVariant }]
        }));
    }, []);

    const removeVariant = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

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

        let productDetails = {
            productType: formData.productType,
            category: formData.category,
            price_egp: formData.price_egp,
            stock: formData.stock,
            status: formData.status,
            featured: formData.featured,
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

            const category = formData.category;
            const categoryFields = {
                'Candles': ['burnTime', 'wickType', 'coverageSpace', 'scents'],
                'Pottery Collection': ['burnTime', 'wickType', 'coverageSpace', 'scentOptions'],
                'Wax Burners': ['typeOptions', 'dimensions'],
                'Deodorant': ['scents', 'skinType', 'keyIngredients'],
                'Soap': ['scents', 'soapWeight', 'featureBenefit', 'keyIngredients'],
                'Body Splash': ['scents', 'sizeOptions'],
                'Shimmering Body Oil': ['color', 'scents', 'oilWeight'],
                'Massage Candles': ['scents', 'massageWeight'],
                'Fresheners': ['scentOptions'],
                'Wax Melts': ['weightOptions', 'scentOptions'],
                'Car Diffusers': ['shapeOptions', 'scentOptions'],
                'Reed Diffusers': ['scentOptions'],
                'Sets': [],
                'Fizzy Salts': ['fizzySpecs']
            };

            const fieldsToKeep = categoryFields[category] || [];
            const allFields = Object.keys(productDetails);
            allFields.forEach(field => {
                if (!['productType', 'category', 'price_egp', 'stock', 'status', 'featured', 
                      'name_en', 'size', 'variants'].includes(field) && 
                    !fieldsToKeep.includes(field)) {
                    delete productDetails[field];
                }
            });

        } else {
            productDetails.bundleName = formData.bundleName;
            productDetails.bundleDescription = formData.bundleDescription;
            productDetails.bundleItems = formData.bundleItems.map(item => ({
                ...item,
                allowedScents: item.allowedScents.join(', ')
            }));
            const singleProductFields = [
                'name_en', 'scents', 'size', 'burnTime', 'wickType', 'coverageSpace', 
                'weight', 'skinType', 'featureBenefit', 'color', 'scentOptions', 
                'sizeOptions', 'weightOptions', 'typeOptions', 'shapeOptions', 
                'keyIngredients', 'dimensions', 'soapWeight', 'oilWeight', 
                'massageWeight', 'fizzySpecs', 'variants' 
            ];
            singleProductFields.forEach(field => delete productDetails[field]);
        }

        const data = new FormData();
        formData.selectedFiles.forEach(file => { data.append('productImages', file); });
        data.append('productData', JSON.stringify(productDetails));

        const url = isEditing ? `${API_BASE_URL}/api/products/${formData._id}` : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, body: data });
            const result = await response.json();

            if (response.ok && result.success) {
                const action = isEditing ? 'updated' : 'created';
                const productName = result.product?.name_en || result.product?.bundleName || result.product?.name || 'product';
                setMessage(`Success! Product "${productName}" ${action}.`);
                resetForm();
                await fetchProducts();
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

    const handleEditProduct = (productToEdit) => {
        const arrayFields = ['scents', 'scentOptions', 'sizeOptions', 'weightOptions', 'typeOptions', 'shapeOptions', 'keyIngredients'];
        const processedData = { ...productToEdit };
        
        arrayFields.forEach(field => {
            processedData[field] = (productToEdit[field] || '').split(',').map(s => s.trim()).filter(Boolean);
        });

        const bundleItemsFormatted = (productToEdit.bundleItems || []).map(item => ({
            ...item,
            allowedScents: (item.allowedScents || '').split(',').map(s => s.trim()).filter(Boolean)
        }));

        setFormData({
            ...initialProductState,
            ...processedData,
            _id: productToEdit._id,
            bundleItems: bundleItemsFormatted,
            selectedFiles: [],
            imagePaths: productToEdit.imagePaths || [],
            variants: productToEdit.variants || [],
        });
        setIsEditing(true);
        setMessage('Editing product. Upload images only to ADD new ones.');
    };

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
                 if (formData._id === productId) resetForm();
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

    const isBundle = formData.productType === 'Bundle';

    const renderCategorySpecificFields = () => {
        const { category } = formData;

        if (isBundle || !category) {
            return (
                <div className="md:col-span-3 text-center text-gray-500 italic p-4">
                    {isBundle ? 'Specifications are defined per bundle item.' : 'Select a category to see specific options.'}
                </div>
            );
        }

        switch (category) {
            case 'Candles':
                return (
                    <>
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
                        <div className="col-span-1">
                            <label htmlFor="scents" className="block text-sm font-medium text-gray-700 mb-1">Scent Name</label>
                            <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla"/>
                            <p className="mt-1 text-xs text-gray-500">Note: Stock management per scent coming soon</p>
                        </div>
                    </>
                );

            case 'Pottery Collection':
                return (
                    <>
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
                        <div className="md:col-span-3">
                            <label htmlFor="scentOptions" className="block text-sm font-medium text-gray-700 mb-1">Scent Options (Comma separated)</label>
                            <input type="text" name="scentOptions" id="scentOptions" value={formData.scentOptions.join(', ')} onChange={(e) => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla, Rose, Oud"/>
                            <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu for the customer. Stock management per scent coming soon</p>
                        </div>
                    </>
                );

            case 'Wax Burners':
                return (
                    <>
                        <div className="md:col-span-3">
                            <label htmlFor="typeOptions" className="block text-sm font-medium text-gray-700 mb-1">Type Options (Comma separated)</label>
                            <input type="text" name="typeOptions" id="typeOptions" value={formData.typeOptions.join(', ')} onChange={(e) => handleArrayChange('typeOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Pottery, Glass"/>
                            <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu. Stock management per type coming soon</p>
                        </div>
                        <div>
                            <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                            <input type="text" name="dimensions" id="dimensions" value={formData.dimensions} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 10x10x5 cm"/>
                        </div>
                    </>
                );

            case 'Deodorant':
                return (
                    <>
                        <div className="col-span-1">
                            <label htmlFor="scents" className="block text-sm font-medium text-gray-700 mb-1">Scent</label>
                            <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Coconut & Lime"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="skinType" className="block text-sm font-medium text-gray-700 mb-1">Skin Type</label>
                            <input type="text" name="skinType" id="skinType" value={formData.skinType} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., For Sensitive Skin"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="keyIngredients" className="block text-sm font-medium text-gray-700 mb-1">Key Ingredients (Comma separated)</label>
                            <input type="text" name="keyIngredients" id="keyIngredients" value={formData.keyIngredients.join(', ')} onChange={(e) => handleArrayChange('keyIngredients', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vitamin E, Aloe Vera"/>
                            <p className="mt-1 text-xs text-gray-500">Displayed as product information (not a dropdown)</p>
                        </div>
                    </>
                );

            case 'Soap':
                return (
                    <>
                        <div className="col-span-1">
                            <label htmlFor="scents" className="block text-sm font-medium text-gray-700 mb-1">Scent</label>
                            <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Lavender & Oats"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="soapWeight" className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                            <input type="text" name="soapWeight" id="soapWeight" value={formData.soapWeight} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 100g"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="featureBenefit" className="block text-sm font-medium text-gray-700 mb-1">Feature / Benefit</label>
                            <input type="text" name="featureBenefit" id="featureBenefit" value={formData.featureBenefit} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., For Acne-Prone Skin"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="keyIngredients" className="block text-sm font-medium text-gray-700 mb-1">Key Ingredients (Comma separated)</label>
                            <input type="text" name="keyIngredients" id="keyIngredients" value={formData.keyIngredients.join(', ')} onChange={(e) => handleArrayChange('keyIngredients', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Shea Butter, Vitamin E"/>
                            <p className="mt-1 text-xs text-gray-500">Displayed as product information (not a dropdown)</p>
                        </div>
                    </>
                );

            case 'Body Splash':
                return (
                    <>
                        <div className="col-span-1">
                            <label htmlFor="scents" className="block text-sm font-medium text-gray-700 mb-1">Scent</label>
                            <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla Passion"/>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="sizeOptions" className="block text-sm font-medium text-gray-700 mb-1">Size Options (Comma separated)</label>
                            <input type="text" name="sizeOptions" id="sizeOptions" value={formData.sizeOptions.join(', ')} onChange={(e) => handleArrayChange('sizeOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 50ml, 100ml, 200ml"/>
                            <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu. Stock management per size coming soon</p>
                        </div>
                    </>
                );

            case 'Shimmering Body Oil':
                return (
                    <>
                        <div className="col-span-1">
                            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                            <input type="text" name="color" id="color" value={formData.color} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Bronze, Gold"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="scents" className="block text-sm font-medium text-gray-700 mb-1">Scent</label>
                            <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Coconut"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="oilWeight" className="block text-sm font-medium text-gray-700 mb-1">Weight / Size</label>
                            <input type="text" name="oilWeight" id="oilWeight" value={formData.oilWeight} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 50ml"/>
                        </div>
                    </>
                );

            case 'Massage Candles':
                return (
                    <>
                        <div className="col-span-1">
                            <label htmlFor="scents" className="block text-sm font-medium text-gray-700 mb-1">Scent</label>
                            <input type="text" name="scents" id="scents" value={formData.scents.join(', ')} onChange={handleScentsChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Lavender"/>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="massageWeight" className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                            <input type="text" name="massageWeight" id="massageWeight" value={formData.massageWeight} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 150g"/>
                        </div>
                    </>
                );

            case 'Fresheners':
                return (
                    <div className="md:col-span-3">
                        <label htmlFor="scentOptions" className="block text-sm font-medium text-gray-700 mb-1">Scent Options (Comma separated)</label>
                        <input type="text" name="scentOptions" id="scentOptions" value={formData.scentOptions.join(', ')} onChange={(e) => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla, Rose, Oud"/>
                        <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu for the customer. Stock management per scent coming soon</p>
                    </div>
                );

            case 'Reed Diffusers':
                return (
                    <div className="md:col-span-3">
                        <label htmlFor="scentOptions" className="block text-sm font-medium text-gray-700 mb-1">Scent Options (Comma separated)</label>
                        <input type="text" name="scentOptions" id="scentOptions" value={formData.scentOptions.join(', ')} onChange={(e) => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla, Rose, Oud"/>
                        <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu for the customer.</p>
                    </div>
                );

            case 'Wax Melts':
                return (
                    <>
                        <div className="md:col-span-3">
                            <label htmlFor="weightOptions" className="block text-sm font-medium text-gray-700 mb-1">Weight Options (Comma separated)</label>
                            <input type="text" name="weightOptions" id="weightOptions" value={formData.weightOptions.join(', ')} onChange={(e) => handleArrayChange('weightOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., 50g, 100g, 200g"/>
                            <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu.</p>
                        </div>
                        <div className="md:col-span-3">
                            <label htmlFor="scentOptions" className="block text-sm font-medium text-gray-700 mb-1">Scent Options (Comma separated)</label>
                            <input type="text" name="scentOptions" id="scentOptions" value={formData.scentOptions.join(', ')} onChange={(e) => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla, Rose, Oud"/>
                            <p className="mt-1 text-xs text-gray-500">These will also appear as a dropdown menu.</p>
                        </div>
                    </>
                );

            case 'Car Diffusers':
                return (
                    <>
                        <div className="md:col-span-3">
                            <label htmlFor="shapeOptions" className="block text-sm font-medium text-gray-700 mb-1">Shape Options (Comma separated)</label>
                            <input type="text" name="shapeOptions" id="shapeOptions" value={formData.shapeOptions.join(', ')} onChange={(e) => handleArrayChange('shapeOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Round, Square, Heart, Star"/>
                            <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu. Stock management per shape coming soon</p>
                        </div>
                        <div className="md:col-span-3">
                            <label htmlFor="scentOptions" className="block text-sm font-medium text-gray-700 mb-1">Scent Options (Comma separated)</label>
                            <input type="text" name="scentOptions" id="scentOptions" value={formData.scentOptions.join(', ')} onChange={(e) => handleArrayChange('scentOptions', e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Vanilla, Rose, Oud"/>
                            <p className="mt-1 text-xs text-gray-500">These will appear as a dropdown menu.</p>
                        </div>
                    </>
                );

            case 'Sets':
                return (
                    <div className="md:col-span-3 text-center text-gray-500 italic p-4">
                        No extra specifications needed for this category.
                        <br/>
                        Use the <strong>Description</strong> fields to detail what is included.
                    </div>
                );

            case 'Fizzy Salts':
                return (
                    <div className="md:col-span-3">
                        <label htmlFor="fizzySpecs" className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
                        <input type="text" name="fizzySpecs" id="fizzySpecs" value={formData.fizzySpecs} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder="e.g., Bath & Body Salts, 500g"/>
                    </div>
                );

            default:
                return (
                    <>
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
                    </>
                );
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* --- NEW: CROPPER MODAL --- */}
            {isCropping && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-lg h-96 bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
                        <Cropper
                            image={cropImage}
                            crop={crop}
                            zoom={zoom}
                            aspect={4 / 5} // Forces 4:5 Ratio (Candle Portrait)
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div className="mt-6 flex flex-col w-full max-w-lg gap-4 bg-white p-4 rounded-lg shadow-lg">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-gray-700 min-w-[40px]">Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(e.target.value)}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex gap-3 justify-end mt-2">
                            <button 
                                onClick={() => {setIsCropping(false); setCropImage(null);}} 
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={showCroppedImage} 
                                className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-md"
                            >
                                Done & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                        <Zap className="w-6 h-6 mr-2 text-indigo-600" />
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
                    {/* Product Type Toggle */}
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

                    {/* Core Details Section */}
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t pt-6">
                        <legend className="md:col-span-2 text-xl font-bold text-gray-800 mb-4"> General Details </legend>

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

                        <div className="col-span-1">
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                            <select name="category" id="category" value={formData.category} onChange={handleChange} required className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                <option value="">Select Category</option>
                                <option value="Bundles">Bundles</option>
                                <option value="Candles">Candles</option>
                                <option value="Pottery Collection">Pottery Collection</option>
                                <option value="Wax Burners">Wax Burners</option>
                                <option value="Fresheners">Fresheners</option>
                                <option value="Wax Melts">Wax Melts</option>
                                <option value="Car Diffusers">Car Diffusers</option>
                                <option value="Reed Diffusers">Reed Diffusers</option>
                                <option value="Deodorant">Deodorant</option>
                                <option value="Soap">Soap</option>
                                <option value="Body Splash">Body Splash</option>
                                <option value="Shimmering Body Oil">Shimmering Body Oil</option>
                                <option value="Massage Candles">Massage Candles</option>
                                <option value="Fizzy Salts">Fizzy Salts</option>
                                <option value="Sets">Sets</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 flex items-center gap-x-3 pt-3">
                            <input type="checkbox" name="featured" id="featured" checked={formData.featured} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                            <label htmlFor="featured" className="block text-sm font-medium text-gray-700">Featured Product (Show on Homepage)</label>
                        </div>

                        <div className="col-span-1">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select name="status" id="status" value={formData.status} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border bg-white">
                                <option value="Active">Active (Visible on site)</option>
                                <option value="Inactive">Inactive (Hidden from site)</option>
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label htmlFor="price_egp" className="block text-sm font-medium text-gray-700 mb-1">Base Price (EGP) <span className="text-red-500">*</span></label>
                            <input type="number" name="price_egp" id="price_egp" value={formData.price_egp} onChange={handlePriceChange} required min="0" step="0.01" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                            <p className="mt-1 text-xs text-gray-500">Used if no variants are added</p>
                        </div>

                        <div className="col-span-1">
                            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">Base Stock Quantity <span className="text-red-500">*</span></label>
                            <input type="number" name="stock" id="stock" value={formData.stock} onChange={handleStockChange} required min="0" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"/>
                            <p className="mt-1 text-xs text-gray-500">Used if no variants are added</p>
                        </div>

                        {!isBundle && (
                            <div className="col-span-1">
                                <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                                <input type="text" name="size" id="size" value={formData.size} onChange={handleChange} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border" placeholder='e.g., "200 gm", "Small"'/>
                            </div>
                        )}
                    </fieldset>

                    {/* NEW: Variants Section */}
                    {!isBundle && (
                        <fieldset className="bg-green-50 p-6 rounded-xl border border-green-200 space-y-4">
                            <legend className="text-xl font-bold text-green-800 flex items-center">
                                <Package className="w-5 h-5 mr-2" /> Product Variants & Pricing
                            </legend>
                            
                            <p className="text-sm text-green-700">
                                Add different variants (sizes, weights, colors) with individual prices and stock.
                                If no variants added, the base price above will be used.
                            </p>

                            {formData.variants && formData.variants.map((variant, index) => (
                                <div key={index} className="p-4 border border-green-300 rounded-lg bg-white">
                                    <h3 className="font-semibold text-gray-800 mb-3 flex justify-between items-center">
                                        Variant #{index + 1}
                                        <button 
                                            type="button" 
                                            onClick={() => removeVariant(index)} 
                                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition" 
                                            title="Remove Variant"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Variant Name</label>
                                            <input
                                                type="text"
                                                value={variant.variantName}
                                                onChange={(e) => handleVariantChange(index, 'variantName', e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="e.g., 100g, 200ml, Red"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                                            <select
                                                value={variant.variantType}
                                                onChange={(e) => handleVariantChange(index, 'variantType', e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="weight">Weight</option>
                                                <option value="size">Size</option>
                                                <option value="color">Color</option>
                                                <option value="scent">Scent</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Price (EGP)</label>
                                            <input
                                                type="number"
                                                value={variant.price}
                                                onChange={(e) => handleVariantChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                                            <input
                                                type="number"
                                                value={variant.stock}
                                                onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm p-2 text-sm border focus:ring-indigo-500 focus:border-indigo-500"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addVariant}
                                className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-green-400 text-sm font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Variant
                            </button>
                        </fieldset>
                    )}

                    {/* Product Specifications Section */}
                    <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 border-t pt-6">
                        <legend className="md:col-span-3 text-xl font-bold text-gray-800 mb-4"> Product Specifications </legend>
                        {renderCategorySpecificFields()}
                    </fieldset>

                    {/* Bundle Description */}
                    {isBundle && (
                        <fieldset className="space-y-4 border-t pt-6">
                            <legend className="text-xl font-bold text-gray-800 mb-4"> Bundle Description </legend>
                            <div>
                                <label htmlFor="bundleDescription" className="block text-sm font-medium text-gray-700 mb-1">Bundle Description</label>
                                <textarea name="bundleDescription" id="bundleDescription" value={formData.bundleDescription} onChange={handleChange} rows="3" className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border"></textarea>
                            </div>
                        </fieldset>
                    )}

                    {/* Image Uploads Section WITH CROPPER */}
                    <fieldset className="border-t pt-6">
                        <legend className="text-xl font-bold text-gray-800 mb-4">
                            Images (Max 5 total) {!isEditing && <span className="text-red-500">* Required for new</span>}
                        </legend>
                        
                        {/* Hidden Input */}
                        <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} className="hidden" style={{display: 'none'}} />
                        
                        <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200 mb-4 font-medium">
                            <Plus className="w-5 h-5 mr-2"/> Select & Crop Image
                        </label>

                        <div className="mt-4 flex flex-wrap gap-4">
                            {/* Existing Images */}
                            {formData.imagePaths?.map((url, i) => (
                                <div key={`existing-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 opacity-80">
                                    <img src={url} className="w-full h-full object-cover"/>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center p-1">Existing</div>
                                </div>
                            ))}
                            
                            {/* New Cropped Images */}
                            {formData.selectedFiles.map((file, i) => (
                                <div key={`new-${i}`} className="relative group w-24 h-24 rounded-lg overflow-hidden border-2 border-green-500">
                                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover"/>
                                    <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Images are forced to 4:5 ratio for perfect display.</p>
                    </fieldset>

                    {/* Bundle Items Section */}
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

                    {/* Submission Button */}
                    <div className="pt-6 border-t mt-8">
                        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                            {isSubmitting ? (
                                <><RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Submitting...</>
                            ) : (
                                isEditing ? 'Update Product' : 'Submit Product / Bundle'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Product List */}
            {!isLoadingData && (
                <div className="bg-white shadow-xl rounded-2xl p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Products</h2>
                    {products.length === 0 ? ( 
                        <p className="text-gray-500">No products found. Add one using the form above!</p> 
                    ) : (
                        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Image</th>
                                        <th scope="col" className="px-4 py-3">Name</th>
                                        <th scope="col" className="px-4 py-3">Type</th>
                                        <th scope="col" className="px-4 py-3">Price (EGP)</th>
                                        <th scope="col" className="px-4 py-3">Stock</th>
                                        <th scope="col" className="px-4 py-3">Variants</th>
                                        <th scope="col" className="px-4 py-3">Status</th>
                                        <th scope="col" className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product._id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3"><img src={product.imagePaths?.[0] || 'https://placehold.co/40x40/cccccc/ffffff?text=?'} alt="" className="w-10 h-10 object-cover rounded"/></td>
                                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{product.name_en || product.bundleName || product.name || 'N/A'}</td>
                                            <td className="px-4 py-3">{product.productType}</td>
                                            <td className="px-4 py-3">{product.price_egp?.toFixed(2)}</td>
                                            <td className="px-4 py-3">{product.stock}</td>
                                            <td className="px-4 py-3">
                                                {product.variants && product.variants.length > 0 ? (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                        {product.variants.length} variants
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">No variants</span>
                                                )}
                                            </td>
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
        </div>
    );
};

export default ProductManager;