module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node scripts/serve-phase18-preview.mjs',
      startServerReadyPattern: '4173',
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
        'uses-text-compression': 'off',
        'uses-long-cache-ttl': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
