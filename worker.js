// worker.js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

import { getDigiPin, getLatLngFromDigiPin } from './src/digipin';

// IMPORTANT: In a production environment, the API key should be stored as a secret/environment variable.
// For Cloudflare Workers, you would use c.env.GOOGLE_API_KEY.
const GOOGLE_API_KEY = 'AIzaSyCL8d9QNWn_wV3CwTArXKzRGqMU5Vib5nc'; // Replace with c.env.GOOGLE_API_KEY in deployment

const app = new Hono();

app.use('/api/*', cors()); // Updated to cover all /api routes

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

app.get('/api/geocode', async (c) => {
  const address = c.req.query('address');
  if (!address) {
    return c.json({ error: 'Address query parameter is required' }, 400);
  }

  const apiKey = c.env.GOOGLE_API_KEY || GOOGLE_API_KEY; // Prefer env variable
  const googleApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await fetch(googleApiUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return c.json({ latitude: location.lat, longitude: location.lng });
    } else if (data.status === 'ZERO_RESULTS') {
      return c.json({ error: 'Address not found by Google Geocoding.', details: data.status }, 404);
    } else {
      console.error('Google Geocoding API Error:', data.status, data.error_message);
      return c.json({ error: 'Google Geocoding API error.', details: data.error_message || data.status }, 500);
    }
  } catch (error) {
    console.error('Error fetching from Google API:', error);
    return c.json({ error: 'Failed to connect to Google Geocoding service.' }, 502);
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
        const filePath = `./public${assetPath}`; // Construct path relative to project root
        return serveStatic({ path: filePath })(c, () => {
            c.status(404);
            return c.text(`${assetPath} not found`);
        });
    });
}

app.get('/swagger.yaml', (c) => {
  // serveStatic should infer Content-Type for .yaml
  return serveStatic({ path: './public/swagger.yaml' })(c, () => {
    c.status(404);
    return c.text('swagger.yaml not found');
  });
});

app.get('/', (c) => {
  return serveStatic({ path: './public/index.html' })(c, () => {
    c.status(404);
    return c.text('index.html not found. API is available at /api/digipin/encode and /api/digipin/decode.');
  });
});

app.get('/pin/:digipinId', (c) => {
  return serveStatic({ path: './public/location_viewer.html' })(c, () => {
    c.status(404);
    return c.text('location_viewer.html not found');
  });
});

export default {
  fetch: app.fetch
};
