// This is now a CommonJS file
const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

// This config tells Vite to build a reusable JS bundle (Library Mode)
module.exports = defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    // --- LIBRARY MODE CONFIGURATION ---
    lib: {
      // '__dirname' is automatically available in CommonJS, so this just works
      entry: path.resolve(__dirname, 'src/assets/AdminProductUploader.jsx'),
      
      name: 'AdminProductUploader',
      fileName: (format) => `admin-bundle.js`,
      formats: ['umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
      },
    },
    // --- OUTPUT LOCATION CONFIGURATION ---
    outDir: '../siraj-frontend/assets',
  }
});