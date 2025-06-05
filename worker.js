// worker.js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDigiPin, getLatLngFromDigiPin } from './src/digipin';

const app = new Hono();

app.use('/api/v1/*', cors());

app.all('/api/v1/digipin/encode', async (c) => {
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

app.all('/api/v1/digipin/decode', async (c) => {
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

app.get('/', (c) => {
  return c.text('DIGIPIN API Worker (v1) is running. Use /api/v1/digipin/encode or /api/v1/digipin/decode endpoints.');
});

export default {
  fetch: app.fetch
};
