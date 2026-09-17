module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve-phase19-preview.mjs',
      startServerReadyPattern: 'Phase 19 production-like preview running at',
      startServerReadyTimeout: 30000,
      url: [
        'http://127.0.0.1:4173/',
        'http://127.0.0.1:4173/services/it/cloud-computing',
        'http://127.0.0.1:4173/careers',
        'http://127.0.0.1:4173/contact'
      ],
      numberOfRuns: 2,
      settings: {
        chromeFlags: '--headless --no-sandbox --disable-dev-shm-usage',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'bf-cache': ['error', { minScore: 0.9 }],
        'third-party-cookies': ['error', { minScore: 0.9 }],
        'inspector-issues': ['error', { minScore: 0.9 }],
        'document-latency-insight': 'warn',
        'network-dependency-tree-insight': 'warn',
        'image-delivery-insight': 'warn',
        'uses-responsive-images': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript-insight': 'warn',
        'uses-text-compression': 'off',
        'uses-long-cache-ttl': 'off'
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci/reports'
    }
  }
};
