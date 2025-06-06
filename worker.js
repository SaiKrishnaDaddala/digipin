// functions/[[path]].js (formerly worker.js)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
// No need for serveStatic if Pages is serving static assets directly

// IMPORTANT: We will no longer import raw HTML/YAML directly.
// Instead, the worker will fetch them from the Pages CDN.
// This means these HTML/YAML files *must* be in your 'public' directory
// and Cloudflare Pages must be configured to serve 'public'.

import { getDigiPin, getLatLngFromDigiPin } from '../src/digipin'; // Adjust path for digipin.js (this import is fine)

const GOOGLE_API_KEY = 'AIzaSyCL8d9QNWn_wV3CwTArXKzRGqMU5Vib5nc'; // Replace with c.env.GOOGLE_API_KEY in deployment

const app = new Hono();

app.use('/api/*', cors());

// --- API Routes (These remain largely the same) ---
app.all('/api/digipin/encode', async (c) => {
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
    const googleApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=<span class="math-inline">\{encodeURIComponent\(address\)\}&key\=</span>{apiKey}`;

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

app.all('/api/digipin/decode', async (c) => {
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

// --- HTML and YAML Serving ---
// The worker will now FETCH these files from the Pages CDN.
// This means 'public/index.html', 'public/location_viewer.html', and 'public/swagger.yaml'
// MUST exist and be served by Cloudflare Pages.

async function getHtmlContent(fileName) {
    // Pages serves static content from the root of your domain (your Pages URL).
    // So, if public/index.html exists, it's accessible at /index.html.
    const response = await fetch(new URL(`/${fileName}`, c.req.url));
    if (!response.ok) {
        throw new Error(`Failed to load ${fileName}: ${response.statusText}`);
    }
    return response.text();
}

app.get('/', async (c) => {
    try {
        const indexHtmlContent = await getHtmlContent('index.html');
        return c.html(indexHtmlContent);
    } catch (error) {
        console.error('Error loading index.html:', error);
        return c.text('Error loading main page.', 500);
    }
});

app.get('/pin/:digipinId', async (c) => {
    try {
        const locationViewerHtmlContent = await getHtmlContent('location_viewer.html');
        return c.html(locationViewerHtmlContent);
    } catch (error) {
        console.error('Error loading location_viewer.html:', error);
        return c.text('Error loading location viewer page.', 500);
    }
});

app.get('/swagger.yaml', async (c) => {
    try {
        const swaggerYamlContent = await getHtmlContent('swagger.yaml');
        c.header('Content-Type', 'text/yaml; charset=utf-8');
        return c.body(swaggerYamlContent);
    } catch (error) {
        console.error('Error loading swagger.yaml:', error);
        return c.text('Error loading Swagger YAML.', 500);
    }
});

// Remove the static asset serving loop if Cloudflare Pages is handling your /public directory.
// For example, /style.css will be served directly by Pages, not by this Function.
// If you truly need the function to serve some specific static assets that are NOT in 'public'
// or you have a very specific use case, we can revisit.
/*
const staticAssetPaths = [
    '/style.css',
    '/script.js',
    '/viewer_style.css',
    '/viewer_script.js',
    '/india_boundary.geojson'
];
// This section is now unnecessary and should be removed.
*/

export default {
    fetch: app.fetch
};