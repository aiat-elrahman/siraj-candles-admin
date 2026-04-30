import React, { useState } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const SINGLES_TEMPLATE = `productType,name_en,category,subcategory,price_egp,stock,status,featured,description_en,scentOptions,sizeOptions,variants
Single,Rose Body Splash,BODY SPLASHES,120ml,200,50,Active,false,A lovely rose scent body splash,Rose|Jasmine||
Single,Reed Diffuser,FRESHNERS,,150,30,Active,true,Long lasting fragrance for your home,Lavender|Musk|Vanilla|||
Single,Scented Candle,CANDLES,SCENTED CANDLES,300,0,Active,false,Hand poured soy wax candle,,,Lavender:300:10|Jasmine:300:5|Rose:300:0`;

const BUNDLES_TEMPLATE = `productType,bundleName,category,bundlePrice,bundleOriginalPrice,stock,status,featured,bundleDescription
Bundle,Relaxation Set,CANDLES,450,550,20,Active,true,Everything you need to unwind
Bundle,Gift Set Deluxe,BODY SPLASHES,800,950,15,Active,false,The perfect luxury gift`;

const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(l => l.trim()).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else current += char;
        }
        values.push(current.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i] || '');
        return obj;
    });
};

const BulkUploadManager = () => {
    const [preview, setPreview] = useState([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFileName(f.name);
        setResult(null);
        setError('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = parseCSV(ev.target.result);
                if (parsed.length === 0) { setError('CSV has no data rows.'); return; }
                setPreview(parsed);
            } catch (err) {
                setError('Could not parse CSV. Make sure it matches the template format.');
            }
        };
        reader.readAsText(f);
    };

    const removeRow = (index) => {
        setPreview(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!preview.length) return;
        setUploading(true);
        setError('');
        setResult(null);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE_URL}/api/products/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ products: preview })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data.created);
                setPreview([]);
                setFileName('');
            } else {
                setError(data.message || 'Upload failed. Check your data and try again.');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = (type) => {
        const content = type === 'singles' ? SINGLES_TEMPLATE : BUNDLES_TEMPLATE;
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `siraj_${type}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const singles = preview.filter(p => p.productType === 'Single');
    const bundles = preview.filter(p => p.productType === 'Bundle');

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Bulk Product Upload</h1>
                <p className="text-gray-500 mb-6 text-sm">Upload multiple products at once. Images can be added later from the Products page.</p>

                {/* Instructions */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-amber-800 mb-2">📋 How to use</h3>
                    <ol className="text-amber-700 text-sm space-y-1 list-decimal list-inside">
                        <li>Download the template for singles or bundles (or both)</li>
                        <li>Open in Excel or Google Sheets — <strong>do not change the column headers</strong></li>
                        <li>Fill one product per row</li>
                        <li>For variants: <code className="bg-white px-1 rounded text-xs">Lavender:200:10|Rose:200:5|Musk:200:0</code> (Name:Price:Stock separated by |)</li>
                        <li>For scent/size options with no price difference: <code className="bg-white px-1 rounded text-xs">Lavender|Rose|Musk</code></li>
                        <li>Save as CSV, upload below, review, then submit</li>
                        <li>After upload, go to Products to add images one by one</li>
                    </ol>
                </div>

                {/* Template Downloads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="border-2 border-dashed border-indigo-200 rounded-lg p-4 text-center">
                        <p className="font-semibold text-gray-700 mb-1">Single Products Template</p>
                        <p className="text-xs text-gray-500 mb-3">For candles, body splashes, deodorants, etc.</p>
                        <button onClick={() => downloadTemplate('singles')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mx-auto text-sm">
                            <Download className="w-4 h-4" /> Download Singles CSV
                        </button>
                    </div>
                    <div className="border-2 border-dashed border-purple-200 rounded-lg p-4 text-center">
                        <p className="font-semibold text-gray-700 mb-1">Bundles Template</p>
                        <p className="text-xs text-gray-500 mb-3">For gift sets and curated bundles</p>
                        <button onClick={() => downloadTemplate('bundles')}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mx-auto text-sm">
                            <Download className="w-4 h-4" /> Download Bundles CSV
                        </button>
                    </div>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-indigo-400 transition-colors">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1 font-medium">Upload your filled CSV file</p>
                    <p className="text-xs text-gray-400 mb-4">You can mix singles and bundles in one file</p>
                    <input type="file" accept=".csv" onChange={handleFile}
                        className="block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                    {fileName && (
                        <p className="text-green-600 mt-3 font-medium text-sm">
                            ✓ {fileName} — {preview.length} products ready ({singles.length} singles, {bundles.length} bundles)
                        </p>
                    )}
                </div>

                {/* Error / Success */}
                {error && (
                    <div className="flex items-start gap-2 p-4 bg-red-50 text-red-700 rounded-lg mb-4 border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
                {result !== null && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg mb-4 border border-green-200">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span>✅ Successfully created <strong>{result} products</strong>! Go to the Products page to add images.</span>
                    </div>
                )}

                {/* Preview Table */}
                {preview.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-800">Preview — Review before uploading</h3>
                            <span className="text-sm text-gray-500">{preview.length} rows</span>
                        </div>
                        <div className="overflow-x-auto border rounded-lg mb-4">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-gray-500">#</th>
                                        <th className="px-3 py-2 text-left text-gray-500">Type</th>
                                        <th className="px-3 py-2 text-left text-gray-500">Name</th>
                                        <th className="px-3 py-2 text-left text-gray-500">Category</th>
                                        <th className="px-3 py-2 text-left text-gray-500">Price</th>
                                        <th className="px-3 py-2 text-left text-gray-500">Stock</th>
                                        <th className="px-3 py-2 text-left text-gray-500">Status</th>
                                        <th className="px-3 py-2 text-left text-gray-500">Variants</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {preview.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    row.productType === 'Bundle'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                }`}>{row.productType}</span>
                                            </td>
                                            <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">
                                                {row.name_en || row.bundleName}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">{row.category}</td>
                                            <td className="px-3 py-2 text-gray-900">{row.price_egp || row.bundlePrice} EGP</td>
                                            <td className="px-3 py-2 text-gray-600">{row.stock}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                    row.status === 'Active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>{row.status}</span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-400 max-w-[120px] truncate">
                                                {row.variants || row.scentOptions || '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <button onClick={() => removeRow(i)}
                                                    className="text-red-400 hover:text-red-600 p-1">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button onClick={handleUpload} disabled={uploading}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm">
                            <Upload className="w-4 h-4" />
                            {uploading
                                ? `Creating ${preview.length} products...`
                                : `Upload All ${preview.length} Products`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkUploadManager;