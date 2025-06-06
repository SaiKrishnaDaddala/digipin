// worker.js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { getDigiPin, getLatLngFromDigiPin } from './src/digipin';

const app = new Hono();

app.use('/api/digipin/*', cors()); // Path updated for CORS

app.all('/api/digipin/encode', async (c) => { // Path updated
  let latitude, longitude;
  if (c.req.method === 'POST') {
    try {
      const body = await c.req.json();
      latitude = body.latitude;
      longitude = body.longitude;
    } catch (e) {
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }
  } else {
    latitude = parseFloat(c.req.query('latitude'));
    longitude = parseFloat(c.req.query('longitude'));
  }

  if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
    return c.json({ error: 'Latitude and Longitude are required and must be numbers.' }, 400);
  }

  try {
    const code = getDigiPin(latitude, longitude);
    return c.json({ digipin: code });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

app.all('/api/digipin/decode', async (c) => { // Path updated
  let digipin;
  if (c.req.method === 'POST') {
    try {
      const body = await c.req.json();
      digipin = body.digipin;
    } catch (e) {
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }
  } else {
    digipin = c.req.query('digipin');
  }

  if (!digipin) {
    return c.json({ error: 'DIGIPIN is required.' }, 400);
  }

  try {
    const coords = getLatLngFromDigiPin(digipin);
    return c.json(coords);
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

// Serve static assets
const staticAssetPaths = [
    '/style.css',
    '/script.js',
    '/viewer_style.css',
    '/viewer_script.js',
    '/india_boundary.geojson'
];

for (const assetPath of staticAssetPaths) {
    app.get(assetPath, (c) => {
        const filePath = `.${assetPath}`; // Path relative to assets dir (public)
        return serveStatic({ path: filePath })(c, () => {
            c.status(404);
            return c.text(`${assetPath} not found`);
        });
    });
}

app.get('/', (c) => {
  // Try to serve index.html from the 'public' directory
  // The path is relative to the project root where wrangler deploys from.
  // Also, update the text message if index.html is not found or if serveStatic is removed later.
  // For now, serveStatic handles it, but the text message in its fallback could be updated too.
  // The primary root message if no static file is served:
  // return c.text('DIGIPIN API Worker is running. Use /api/digipin/encode or /api/digipin/decode endpoints.');
  return serveStatic({ path: './index.html' })(c, () => { // Path updated
    c.status(404);
    return c.text('index.html not found. API is available at /api/digipin/encode and /api/digipin/decode.');
  });
});

app.get('/pin/:digipinId', (c) => {
  // The digipinId is available via c.req.param('digipinId')
  // Client-side JS in location_viewer.html will use the URL.
  return serveStatic({ path: './location_viewer.html' })(c, () => { // Path updated
    c.status(404);
    return c.text('location_viewer.html not found');
  });
});

export default {
  fetch: app.fetch
};
