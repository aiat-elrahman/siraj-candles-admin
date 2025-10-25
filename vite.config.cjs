
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');


module.exports = defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    // --- LIBRARY MODE CONFIGURATION ---
    lib: {
      // Use a direct relative path instead of path.resolve
      entry: './src/AdminProductUploader.jsx', // <-- THIS IS THE FIX
      
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
    outDir: '../siraj-candles-frontend/assets',
  }
});