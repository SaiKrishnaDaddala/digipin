// worker.js
import { Hono } from 'hono';
import { cors } from 'hono/cors'; // Import CORS middleware if needed
import { getDigiPin, getLatLngFromDigiPin } from './src/digipin'; // Assuming digipin.js is in src

const app = new Hono();

// Optional: Add CORS middleware if your Pages frontend will call this Worker from a different subdomain
// or if you want to allow other origins.
app.use('/api/*', cors()); // Apply CORS to all /api routes

// Define the /encode route (handles both GET and POST, similar to original Express setup)
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
  } else { // GET request
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

// Define the /decode route (handles both GET and POST)
app.all('/api/digipin/decode', async (c) => {
  let digipin;
  if (c.req.method === 'POST') {
    try {
      const body = await c.req.json();
      digipin = body.digipin;
    } catch (e) {
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }
  } else { // GET request
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

// Optional: Add a root route for basic info or health check for the worker URL
app.get('/', (c) => {
  return c.text('DIGIPIN API Worker is running. Use /api/digipin/encode or /api/digipin/decode endpoints.');
});

// Hono's fetch export is what Cloudflare Workers expect
export default {
  fetch: app.fetch
};
