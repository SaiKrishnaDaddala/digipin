const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const digipinRoutes = require('./routes/digipin.routes');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const fs = require('fs');
const path = require('path');

// const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
const swaggerDocument = YAML.parse(fs.readFileSync(path.join(__dirname, '../swagger.yaml'), 'utf8'));

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '../public'))); // Added static middleware

// Serve index.html for the root path
app.get('/', (req, res) => { // Added root route
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Swagger Docs Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route to serve the location viewer page
app.get('/pin/:digipinId', (req, res) => {
  // req.params.digipinId will contain the DIGIPIN from the URL.
  // The client-side JavaScript in location_viewer.html will handle extracting it.
  res.sendFile(path.join(__dirname, '../public', 'location_viewer.html'), (err) => {
    if (err) {
      // If location_viewer.html doesn't exist or other error, send a 404 or error.
      // This is important because otherwise a generic HTML error page might be sent
      // which could be confusing if the file is missing.
      console.error('Error sending location_viewer.html:', err);
      if (!res.headersSent) { // Check if headers were already sent
         res.status(err.status || 500).send('Error loading page or page not found.');
      }
    }
  });
});

// DIGIPIN API Routes
app.use('/api/digipin', digipinRoutes);

module.exports = app;
