
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// This config tells Vite to build a reusable JS bundle (Library Mode)
export default defineConfig({
  plugins: [react()],
  define: {
    // This line injects the environment variable into your code, 
    // making 'process is not defined' error go away for most cases.
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    // --- LIBRARY MODE CONFIGURATION ---
    lib: {
      // Point the entry to where the AdminProductUploader will be
      entry: path.resolve(__dirname, 'src/AdminProductUploader.jsx'),
      // The name of the global variable the bundle will create (e.g., window.AdminProductUploader)
      name: 'AdminProductUploader',
      // The name of the output file
      fileName: (format) => `admin-bundle.js`,
      // Use 'umd' format for maximum browser compatibility with script tags
      formats: ['umd']
    },
    rollupOptions: {
      // Exclude React and ReactDOM from the bundle because we load them via CDN in the HTML
      external: ['react', 'react-dom'],
      output: {
        // Tell the bundle where to find React/ReactDOM (on the global window object)
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
      },
    },
    // --- OUTPUT LOCATION CONFIGURATION ---
    // Based on your file structure, this puts the 'admin-bundle.js' file into the 'assets' folder
    // which is adjacent to 'admin-upload.html' (siraj-frontend/assets)
    outDir: '../siraj-frontend/assets',
  }
}

);