import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, RefreshCw, Bold, Italic, List, ListOrdered, Heading1, Heading2, Minus } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

// ── Rich Text Editor ──────────────────────────────────────────────────────────
const RichTextEditor = ({ value, onChange }) => {
    const editorRef = useRef(null);
    const isInternalUpdate = useRef(false);

    // Sync external value → editor (only on mount or external reset)
    useEffect(() => {
        if (editorRef.current && !isInternalUpdate.current) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const exec = (command, val = null) => {
        editorRef.current?.focus();
        document.execCommand(command, false, val);
        emitChange();
    };

    const emitChange = useCallback(() => {
        isInternalUpdate.current = true;
        onChange(editorRef.current?.innerHTML || '');
        setTimeout(() => { isInternalUpdate.current = false; }, 0);
    }, [onChange]);

    const insertHeading = (tag) => {
        editorRef.current?.focus();
        document.execCommand('formatBlock', false, tag);
        emitChange();
    };

    const toolbarBtn = (onClick, icon, title, active = false) => (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-gray-200' : ''}`}
        >
            {icon}
        </button>
    );

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
                {toolbarBtn(() => insertHeading('h2'), <Heading1 size={16} />, 'Heading 1')}
                {toolbarBtn(() => insertHeading('h3'), <Heading2 size={16} />, 'Heading 2')}
                <div className="w-px h-5 bg-gray-300 mx-1" />
                {toolbarBtn(() => exec('bold'), <Bold size={16} />, 'Bold')}
                {toolbarBtn(() => exec('italic'), <Italic size={16} />, 'Italic')}
                <div className="w-px h-5 bg-gray-300 mx-1" />
                {toolbarBtn(() => exec('insertUnorderedList'), <List size={16} />, 'Bullet List')}
                {toolbarBtn(() => exec('insertOrderedList'), <ListOrdered size={16} />, 'Numbered List')}
                <div className="w-px h-5 bg-gray-300 mx-1" />
                {toolbarBtn(() => exec('insertHorizontalRule'), <Minus size={16} />, 'Divider')}
                {toolbarBtn(() => exec('removeFormat'), <X size={16} />, 'Clear Formatting')}
            </div>

            {/* Editable area */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={emitChange}
                onKeyDown={(e) => {
                    // Shift+Enter = line break instead of new paragraph
                    if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        exec('insertLineBreak');
                    }
                }}
                className="min-h-[200px] p-3 outline-none text-gray-800 text-sm leading-relaxed rich-editor-content"
                style={{ whiteSpace: 'pre-wrap' }}
            />

            {/* Hint */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex flex-wrap gap-3">
                <span>H1 / H2 = headers</span>
                <span>• = bullet list</span>
                <span>1. = numbered list</span>
                <span>Shift+Enter = new line</span>
                <span>Enter = new paragraph</span>
            </div>
        </div>
    );
};

// ── Render saved HTML safely in the preview cell ──────────────────────────────
const HtmlPreview = ({ html }) => (
    <div
        className="rich-preview text-xs text-gray-600 max-w-xs line-clamp-2"
        dangerouslySetInnerHTML={{ __html: html }}
    />
);

// ── Main Component ────────────────────────────────────────────────────────────
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
        setFormData({ category: '', careTitle: '', careContent: '' });
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
            const response = await fetch(`${API_BASE_URL}/api/care/${id}`, { method: 'DELETE' });
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
        setFormData({ category: care.category, careTitle: care.careTitle, careContent: care.careContent });
        setEditingCare(care);
        setShowForm(true);
    };

    return (
        <>
            {/* Scoped styles for the rich editor and rendered output */}
            <style>{`
                .rich-editor-content h2 { font-size: 1.2em; font-weight: 700; margin: 0.5em 0 0.25em; }
                .rich-editor-content h3 { font-size: 1.05em; font-weight: 600; margin: 0.5em 0 0.25em; }
                .rich-editor-content ul { list-style: disc; padding-left: 1.4em; margin: 0.25em 0; }
                .rich-editor-content ol { list-style: decimal; padding-left: 1.4em; margin: 0.25em 0; }
                .rich-editor-content li { margin: 0.15em 0; }
                .rich-editor-content hr { border: none; border-top: 1px solid #d1d5db; margin: 0.75em 0; }
                .rich-editor-content p { margin: 0.25em 0; }
                .rich-preview h2 { font-size: 1em; font-weight: 700; }
                .rich-preview h3 { font-size: 0.95em; font-weight: 600; }
                .rich-preview ul { list-style: disc; padding-left: 1.2em; }
                .rich-preview ol { list-style: decimal; padding-left: 1.2em; }
            `}</style>

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

                    {/* Form */}
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
                                            <option key={cat._id} value={cat.name}>{cat.name}</option>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Care Content
                                        <span className="ml-2 text-xs font-normal text-gray-400">— use the toolbar to format your text</span>
                                    </label>
                                    <RichTextEditor
                                        key={editingCare?._id || 'new'}
                                        value={formData.careContent}
                                        onChange={(html) => setFormData((prev) => ({ ...prev, careContent: html }))}
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

                    {/* Table */}
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
                                                <HtmlPreview html={care.careContent} />
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
        </>
    );
};

export default CareManager;