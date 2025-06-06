// worker.js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

// --- Embedded File Contents ---

const indexHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>DIGIPIN Finder</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css" />
  <script src='https://npmcdn.com/@turf/turf/turf.min.js'></script> <!-- Added Turf.js -->
  <link rel="stylesheet" href="style.css"> <!-- Link the new stylesheet -->
</head>
<body>
  <header>
    <h1>DIGIPIN Finder & Generator</h1>
  </header>
  <main>
    <div id="controls-container">
      <div class="control-group">
        <h3>Search Address / Place</h3>
        <!-- The Leaflet Geocoder will be added to the map, its search bar appears on the map. -->
        <p style="text-align: center; font-size: 0.9em;">Use the search bar on the map (top-left) to find a location by address.</p>
      </div>

      <div class="control-group">
        <h3>Search with Google</h3>
        <input type="text" id="google-address-input" placeholder="Enter address for Google Search">
        <button id="google-address-search-button">Search Address</button>
      </div>

      <div class="control-group">
        <h3>Use My Current Location</h3>
        <button id="use-location-button">Get DIGIPIN for My Location</button>
      </div>

      <div class="control-group">
        <h3>Get DIGIPIN by Clicking on Map</h3>
        <p style="text-align: center; font-size: 0.9em;">Click anywhere on the map to select a point and generate its DIGIPIN.</p>
      </div>

      <div class="control-group">
        <h3>Decode DIGIPIN</h3>
        <input type="text" id="digipin-input" placeholder="Enter DIGIPIN (e.g., XXXX-XXX-XXX)">
        <button id="decode-button">Decode & Show on Map</button>
      </div>

      <div class="control-group">
        <h3>Get DIGIPIN from Coordinates</h3>
        <input type="number" id="lat-input" placeholder="Latitude (e.g., 12.9716)" step="any">
        <input type="number" id="lon-input" placeholder="Longitude (e.g., 77.5946)" step="any">
        <button id="coords-to-digipin-button">Get DIGIPIN & Show on Map</button>
      </div>

      <div class="control-group">
        <h3>Generated DIGIPIN</h3>
        <div id="digipin-display">[DIGIPIN will appear here]</div>
      </div>

    </div>
    <div id="map-container"></div>
  </main>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@gh-pages/qrcode.min.js"></script>
  <script src="script.js"></script>

  <div id="qr-modal" class="modal" style="display:none;">
      <div class="modal-content">
          <span class="close-button" id="qr-modal-close-btn">&times;</span>
          <h4>Scan QR Code</h4>
          <div id="qrcode-display"></div>
          <p id="qr-link-text"></p>
      </div>
  </div>
</body>
</html>
`; // End of indexHtmlContent

const locationViewerHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DIGIPIN Location Viewer</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <link rel="stylesheet" href="/viewer_style.css">
</head>
<body>
    <div id="viewer-container">
        <div id="info-panel">
            <h3>Location Details</h3>
            <p><strong>DIGIPIN:</strong> <span id="viewer-digipin">Loading...</span></p>
            <p><strong>Latitude:</strong> <span id="viewer-lat">Loading...</span></p>
            <p><strong>Longitude:</strong> <span id="viewer-lon">Loading...</span></p>
            <!-- Accuracy is not directly available from decode, so it's omitted for now -->
            <h4>Share this link (QR Code):</h4>
            <div id="viewer-qrcode"></div>
            <button id="open-google-maps-btn">Open in Google Maps</button>
        </div>
        <div id="map-viewer"></div>
    </div>

    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@gh-pages/qrcode.min.js"></script>
    <script src="/viewer_script.js"></script>
</body>
</html>
`; // End of locationViewerHtmlContent

const swaggerYamlFileContent = `
openapi: 3.0.0
info:
  title: DIGIPIN API
  description: Encode and decode DIGIPIN based on latitude and longitude
  version: 1.0.0
servers:
  - url: https://{customApiDomain}/api
    description: Your custom domain for the API. Update the 'customApiDomain' variable with your domain name (e.g., api.example.com). The '/api' path is part of this server configuration.
    variables:
      customApiDomain:
        default: api.yourcustomdomain.com
        description: Enter your custom domain name here (e.g., api.example.com or my-service.example.com).
  - url: https://{workerName}.{accountSubdomain}.workers.dev/api
    description: Deployed Cloudflare Worker URL. Update the variables with your specific deployment details.
    variables:
      workerName:
        default: digipin-api-worker
        description: Your Cloudflare Worker's name.
      accountSubdomain:
        default: your-account-name
        description: Your Cloudflare account's subdomain for workers.
  - url: http://localhost:8787/api
    description: Local development server (typically started with 'wrangler dev').

paths:
  /digipin/encode:
    post:
      summary: Encode lat/lon into DIGIPIN
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                latitude:
                  type: number
                longitude:
                  type: number
      responses:
        '200':
          description: Successfully encoded DIGIPIN
          content:
            application/json:
              schema:
                type: object
                properties:
                  digipin:
                    type: string
        '400':
          description: Invalid input
    get:
      summary: Encode latitude and longitude into DIGIPIN
      parameters:
        - in: query
          name: latitude
          required: true
          schema:
            type: number
        - in: query
          name: longitude
          required: true
          schema:
            type: number
      responses:
        '200':
          description: Successfully encoded DIGIPIN
          content:
            application/json:
              schema:
                type: object
                properties:
                  digipin:
                    type: string
        '400':
          description: Invalid input

  /digipin/decode:
    post:
      summary: Decode DIGIPIN to coordinates
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                digipin:
                  type: string
      responses:
        '200':
          description: Successfully decoded DIGIPIN
          content:
            application/json:
              schema:
                type: object
                properties:
                  latitude:
                    type: number
                  longitude:
                    type: number
        '400':
          description: Invalid DIGIPIN
    get:
      summary: Decode DIGIPIN to coordinates
      parameters:
        - in: query
          name: digipin
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successfully decoded DIGIPIN
          content:
            application/json:
              schema:
                type: object
                properties:
                  latitude:
                    type: number
                  longitude:
                    type: number
        '400':
          description: Invalid DIGIPIN
`; // End of swaggerYamlFileContent

// --- End of Embedded File Contents ---

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
  c.header('Content-Type', 'text/yaml; charset=utf-8');
  return c.body(swaggerYamlFileContent);
});

app.get('/', (c) => {
  return c.html(indexHtmlContent);
});

app.get('/pin/:digipinId', (c) => {
  return c.html(locationViewerHtmlContent);
});

export default {
  fetch: app.fetch
};
