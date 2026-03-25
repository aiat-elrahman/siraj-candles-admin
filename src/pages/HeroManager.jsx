import React, { useState, useEffect } from 'react';
import { Save, Upload, RefreshCw } from 'lucide-react';

const HeroManager = () => {
  const [heroData, setHeroData] = useState({
    backgroundImage: '',
    buttonText: 'Shop Now',
    buttonLink: '/products.html',
    title: '',
    subtitle: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const API_BASE_URL = 'https://siraj-backend.onrender.com';

  useEffect(() => {
    fetchHeroData();
  }, []);

  const fetchHeroData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/hero`);
      if (response.ok) {
        const data = await response.json();
        setHeroData(data);
      }
    } catch (error) {
      console.error('Failed to load hero data:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setHeroData({...heroData, backgroundImage: data.imageUrl});
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const saveHeroSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/settings/hero`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(heroData)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Hero section updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Hero Section Settings</h2>
        <p className="text-gray-600 mb-6">Customize the main banner on your homepage</p>
        
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="space-y-6">
          {/* Background Image */}
          <div className="border-b pb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hero Background Image
            </label>
            <div className="mt-1 flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="hero-image-upload"
              />
              <label
                htmlFor="hero-image-upload"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Image'}
              </label>
              {heroData.backgroundImage && (
                <button
                  onClick={() => setHeroData({...heroData, backgroundImage: ''})}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  Remove
                </button>
              )}
            </div>
            {heroData.backgroundImage && (
              <div className="mt-4">
                <img 
                  src={heroData.backgroundImage} 
                  alt="Hero Preview" 
                  className="w-full max-h-64 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>
          
          {/* Title & Subtitle */}
          <div className="border-b pb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hero Title (Optional)
            </label>
            <input
              type="text"
              value={heroData.title || ''}
              onChange={(e) => setHeroData({...heroData, title: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Illuminate Your Space"
            />
          </div>
          
          <div className="border-b pb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hero Subtitle (Optional)
            </label>
            <input
              type="text"
              value={heroData.subtitle || ''}
              onChange={(e) => setHeroData({...heroData, subtitle: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Handcrafted with love"
            />
          </div>
          
          {/* Button Settings */}
          <div className="border-b pb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Button Text
            </label>
            <input
              type="text"
              value={heroData.buttonText}
              onChange={(e) => setHeroData({...heroData, buttonText: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Button Link
            </label>
            <input
              type="text"
              value={heroData.buttonLink}
              onChange={(e) => setHeroData({...heroData, buttonLink: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="/products.html"
            />
            <p className="text-xs text-gray-500 mt-1">Use relative paths like /products.html or full URLs</p>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="mt-8 pt-4 border-t">
          <button
            onClick={saveHeroSettings}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      {/* Preview Section */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Preview</h3>
        <div 
          className="relative h-64 rounded-lg overflow-hidden bg-gray-100"
          style={heroData.backgroundImage ? {
            backgroundImage: `url(${heroData.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center">
            {heroData.title && (
              <h1 className="text-white text-3xl font-bold text-center mb-2">{heroData.title}</h1>
            )}
            {heroData.subtitle && (
              <p className="text-white text-lg text-center mb-4">{heroData.subtitle}</p>
            )}
            <button className="px-6 py-2 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition">
              {heroData.buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroManager;