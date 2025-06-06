// worker.js
// functions/[[path]].js (formerly worker.js)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
// Remove serveStatic here, as Cloudflare Pages will handle static assets

// For HTML, instead of importing as raw strings, you can fetch them if absolutely necessary,
// or better yet, serve them directly via Cloudflare Pages and have your worker only
// return HTML for specific dynamic routes.
// If you MUST return the HTML from the worker, you can keep them as raw strings
// AND configure wrangler.toml correctly. Let's assume for now you want to keep them as strings.

// Correcting the import paths relative to the worker.js's new location.
// Assuming 'public' is still at the project root level.
// NOTE: For Pages Functions, the build environment for the function itself
// might not automatically resolve these raw imports without a specific
// build configuration (like esbuild loaders for text files).
// The most robust way for Pages Functions to include raw HTML is often
// still to configure the build process to include them or fetch them.

// Let's stick with the 'import as raw string' method for now, but be aware
// that the `wrangler.toml` part is crucial. The path here is relative to
// the FUNCTIONS directory.
// Since 'public' is a sibling to 'functions', you need to go up one level and then down into 'public'.
import indexHtml from '../public/index.html'; // Changed path and removed ?raw
import locationViewerHtml from '../public/location_viewer.html'; // Changed path and removed ?raw
import swaggerYamlContent from '../public/swagger.yaml'; // Changed path and removed ?raw

import { getDigiPin, getLatLngFromDigiPin } from '../src/digipin'; // Adjust path for digipin.js


// Note on HTML serving:
// The index.html and location_viewer.html files are imported as raw strings and served directly.
// This approach is used to prevent '__STATIC_CONTENT_MANIFEST' errors that can occur
// when `serveStatic` from 'hono/cloudflare-workers' is used for HTML files in a
// worker-only deployment (not as part of a Cloudflare Pages project with Functions).
//
// For this to work:
// 1. The bundler used by Wrangler must support importing .html?raw files as strings.
// 2. Static assets (CSS, JS, images, .geojson) referenced in these HTML files
//    must be served correctly. If using Cloudflare Pages, Pages handles this from
//    the 'public' directory. If this worker is deployed standalone and *must* serve
//    these assets, additional routes or a different static asset strategy would be needed
//    for those assets (e.g., importing them as raw strings too, or using KV store).
//    The existing `serveStatic` calls for specific assets like /style.css might still
//    face issues in a pure standalone worker if they also implicitly depend on the manifest.

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
        const filePath = `.${assetPath}`; // Path relative to assets dir (public)
        return serveStatic({ path: filePath })(c, () => {
            c.status(404);
            return c.text(`${assetPath} not found`);
        });
    });
}

// For swagger.yaml, if you want it served as a static asset, put it in 'public'.
// If you want the worker to return its content, you can keep this.
app.get('/swagger.yaml', (c) => {
    c.header('Content-Type', 'text/yaml; charset=utf-8');
    return c.body(swaggerYamlContent);
});

// These routes will return the HTML content directly from the worker.
// This is fine if you want the worker to control these specific HTML responses.
app.get('/', (c) => {
    return c.html(indexHtml);
});

app.get('/pin/:digipinId', (c) => {
    return c.html(locationViewerHtml);
});

export default {
    fetch: app.fetch
};