#!/usr/bin/env node

// Mobile optimization script for Aurora Energy Monitor
const fs = require('fs');
const path = require('path');

console.log('🚀 Optimizing Aurora Energy Monitor for mobile performance...\n');

// 1. Update package.json with mobile-optimized build scripts
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add mobile-specific build scripts
packageJson.scripts = {
  ...packageJson.scripts,
  "build:mobile": "vite build --mode production --target es2015",
  "preview:mobile": "vite preview --host 0.0.0.0 --port 4173",
  "analyze": "vite build --mode production && npx vite-bundle-analyzer dist",
  "lighthouse": "lighthouse http://localhost:4173 --output html --output-path ./lighthouse-report.html"
};

// Add mobile performance dependencies
const mobileDevDeps = {
  "vite-bundle-analyzer": "^0.7.0",
  "lighthouse": "^11.0.0",
  "workbox-vite-plugin": "^1.0.0"
};

packageJson.devDependencies = {
  ...packageJson.devDependencies,
  ...mobileDevDeps
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json with mobile optimization scripts');

// 2. Create service worker for offline functionality
const swContent = `
// Aurora Energy Monitor Service Worker
const CACHE_NAME = 'aurora-energy-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});
`;

fs.writeFileSync(path.join(__dirname, 'public', 'sw.js'), swContent);
console.log('✅ Created service worker for offline functionality');

// 3. Create web app manifest
const manifest = {
  "name": "Aurora Energy Monitor",
  "short_name": "Aurora Energy",
  "description": "Real-time KPLC energy monitoring with token tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#10b981",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["utilities", "productivity"],
  "lang": "en",
  "dir": "ltr"
};

fs.writeFileSync(path.join(__dirname, 'public', 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('✅ Created PWA manifest');

// 4. Update index.html for mobile optimization
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Add mobile meta tags and PWA links
const mobileMetaTags = `
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Aurora Energy">
  <meta name="theme-color" content="#10b981">
  <meta name="msapplication-TileColor" content="#0f172a">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
`;

// Insert mobile meta tags after the existing viewport tag
indexContent = indexContent.replace(
  /<meta name="viewport"[^>]*>/,
  mobileMetaTags.trim()
);

fs.writeFileSync(indexPath, indexContent);
console.log('✅ Updated index.html with mobile optimization tags');

// 5. Create mobile performance tips
const performanceTips = `
# 🚀 Aurora Energy Monitor - Mobile Performance Guide

## Optimizations Implemented:

### 1. Code Splitting & Lazy Loading
- ✅ Lazy loaded route components
- ✅ Dynamic imports for heavy libraries
- ✅ Optimized bundle chunks

### 2. Mobile-First Design
- ✅ Responsive layouts with mobile breakpoints
- ✅ Touch-friendly UI components (44px minimum tap targets)
- ✅ Optimized chart rendering for small screens

### 3. Performance Enhancements
- ✅ Reduced animation durations on mobile
- ✅ Optimized image loading
- ✅ Minimized re-renders with React.memo
- ✅ Efficient data fetching with React Query

### 4. KPLC Token Features
- ✅ Real-time token balance tracking
- ✅ Smart notifications for low balance
- ✅ Token purchase simulation
- ✅ Usage prediction analytics

### 5. PWA Features
- ✅ Service worker for offline functionality
- ✅ Web app manifest for home screen installation
- ✅ Mobile-optimized icons and splash screens

## Build Commands:

\`\`\`bash
# Standard build
npm run build

# Mobile-optimized build
npm run build:mobile

# Preview mobile build
npm run preview:mobile

# Analyze bundle size
npm run analyze

# Run Lighthouse audit
npm run lighthouse
\`\`\`

## Mobile Testing:

1. **Chrome DevTools**: Use device simulation
2. **Real Device Testing**: Connect via network IP
3. **Lighthouse**: Performance, accessibility, PWA scores
4. **Network Throttling**: Test on slow connections

## Performance Targets:
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 3s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 4s

## KPLC Integration Notes:
- Token balance updates in real-time
- Notifications trigger at configurable thresholds
- Analytics predict usage patterns
- Offline functionality for viewing cached data
`;

fs.writeFileSync(path.join(__dirname, 'MOBILE_PERFORMANCE.md'), performanceTips);
console.log('✅ Created mobile performance guide');

console.log('\n🎉 Mobile optimization complete!');
console.log('\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run build:mobile');
console.log('3. Run: npm run preview:mobile');
console.log('4. Test on mobile devices');
console.log('5. Run: npm run lighthouse (for performance audit)');