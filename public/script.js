// public/script.js
const API_BASE_URL = ''; // Keep this as is

let INDIA_GEOJSON_DATA = null; // Will hold the fetched GeoJSON data

// Style for India boundary
const indiaBoundaryStyle = {
  color: "#007bff", // Blue color
  weight: 2,
  opacity: 0.6,
  fillOpacity: 0.05 // Light fill
};

let map;
let geocoderControl;

// Helper function to check if a point is within India's boundary
function isPointInIndia(latitude, longitude) {
  if (!INDIA_GEOJSON_DATA || !INDIA_GEOJSON_DATA.features || INDIA_GEOJSON_DATA.features.length === 0) {
    console.error("India GeoJSON data is not loaded or invalid for isPointInIndia check.");
    return false; // Failsafe: if data is missing, consider it outside
  }
  const indiaFeature = INDIA_GEOJSON_DATA.features[0];
  // console.log("Geometry type being used:", JSON.stringify(indiaFeature.geometry.type)); // Retained for debugging if needed

  const point = turf.point([longitude, latitude]); // Turf.js expects [lng, lat]
  const isInside = turf.booleanPointInPolygon(point, indiaFeature.geometry);

  // Debugging test case for Delhi (can be removed or commented out in production)
  if (typeof turf !== 'undefined' && INDIA_GEOJSON_DATA && INDIA_GEOJSON_DATA.features[0] && INDIA_GEOJSON_DATA.features[0].geometry) {
    // console.log("Test with Delhi (should be true):", turf.booleanPointInPolygon(turf.point([77.216721, 28.644800]), INDIA_GEOJSON_DATA.features[0].geometry));
  } else {
    // console.error("Turf.js or INDIA_GEOJSON_DATA not properly initialized for Delhi test.");
  }
  return isInside;
}

async function fetchDigipinAndDisplayMap(latitude, longitude) {
  const digipinDisplay = document.getElementById('digipin-display');
  try {
    const response = await fetch(`${API_BASE_URL}/api/digipin/encode?latitude=${latitude}&longitude=${longitude}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const digipin = data.digipin;

    digipinDisplay.textContent = 'DIGIPIN: ' + digipin;

    // Ensure map is initialized before setting view or adding markers.
    // This function might be called before initializeMapFeatures if a direct decode/coord input happens first.
    // However, initializeMapFeatures is designed to be called first via loadIndiaBoundaryData.
    if (map) {
        map.setView([latitude, longitude], 13);
    } else {
        // This case should ideally not be hit if initialization order is correct.
        console.warn("fetchDigipinAndDisplayMap called before map was fully initialized. Initializing basic map.");
        map = L.map('map-container').setView([latitude, longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        // Consider adding boundary and geocoder here too if this path is possible,
        // or ensure initializeMapFeatures has always run first.
    }

    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    L.marker([latitude, longitude]).addTo(map)
      .bindPopup('DIGIPIN: ' + digipin)
      .openPopup();

  } catch (error) {
    console.error('Error fetching DIGIPIN or displaying map:', error);
    if (digipinDisplay) digipinDisplay.textContent = 'Error: ' + error.message;
  }
}

function initializeMapFeatures() {
  if (!INDIA_GEOJSON_DATA) {
    console.error("India GeoJSON data not loaded. Cannot initialize map features.");
    // Optionally, display an error to the user on the page
    const digipinDisplay = document.getElementById('digipin-display');
    if (digipinDisplay) digipinDisplay.textContent = "Error: Could not load map boundary data. Please refresh.";
    return;
  }

  map = L.map('map-container').setView([20.5937, 78.9629], 5); // Default view (e.g., India)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add India boundary GeoJSON layer
  L.geoJSON(INDIA_GEOJSON_DATA, { style: indiaBoundaryStyle }).addTo(map);

  geocoderControl = L.Control.geocoder({
      defaultMarkGeocode: false,
      geocodingQueryParams: {
        'countrycodes': 'in',
        'accept-language': 'en'
      }
  })
  .on('markgeocode', function(e) {
      const center = e.geocode.center;
      // Geocoder results are already expected to be within India due to 'countrycodes': 'in'
      // but an additional check can be added if desired.
      fetchDigipinAndDisplayMap(center.lat, center.lng);
  })
  .addTo(map);

  map.on('click', function(e) {
    const latitude = e.latlng.lat;
    const longitude = e.latlng.lng;
    if (isPointInIndia(latitude, longitude)) {
      console.log(`Map clicked within India at: Lat: ${latitude}, Lng: ${longitude}`);
      fetchDigipinAndDisplayMap(latitude, longitude);
    } else {
      alert("Clicks are restricted to within India's boundary.");
      console.log(`Map clicked outside India at: Lat: ${latitude}, Lng: ${longitude}`);
    }
  });
}

async function loadIndiaBoundaryData() {
  try {
    const response = await fetch('./india_boundary.geojson');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    INDIA_GEOJSON_DATA = await response.json();
    console.log("India boundary data loaded successfully.");
    initializeMapFeatures(); // Initialize map and dependent features after data is loaded
  } catch (error) {
    console.error("Could not load India boundary data:", error);
    const digipinDisplay = document.getElementById('digipin-display');
    if (digipinDisplay) digipinDisplay.textContent = "Critical Error: Could not load map boundary. App may not function correctly.";
    // Fallback: Initialize map without boundary? Or display persistent error.
    // For now, map features dependent on GeoJSON won't be initialized.
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadIndiaBoundaryData(); // Load GeoJSON first, then initialize map features

  // Event listeners for controls that don't strictly depend on map/GeoJSON being loaded first
  // or can gracefully handle map not being ready (though current design initializes map).
  const useLocationButton = document.getElementById('use-location-button');
  const digipinDisplay = document.getElementById('digipin-display'); // Re-used for messages

  if (useLocationButton) {
    useLocationButton.addEventListener('click', () => {
      if (!map || !INDIA_GEOJSON_DATA) { // Check if map and data are ready
        alert("Map or boundary data is not ready. Please wait or refresh.");
        return;
      }
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            if (isPointInIndia(latitude, longitude)) {
              fetchDigipinAndDisplayMap(latitude, longitude);
            } else {
              alert("Your current location appears to be outside India. DIGIPINs are generated for locations within India.");
              if (digipinDisplay) digipinDisplay.textContent = "Location outside India.";
            }
          },
          (error) => {
            let errorMessage = 'Error getting location: ';
            switch(error.code) {
              case error.PERMISSION_DENIED: errorMessage += "User denied the request for Geolocation."; break;
              case error.POSITION_UNAVAILABLE: errorMessage += "Location information is unavailable."; break;
              case error.TIMEOUT: errorMessage += "The request to get user location timed out."; break;
              case error.UNKNOWN_ERROR: errorMessage += "An unknown error occurred."; break;
            }
            console.error(errorMessage);
            if (digipinDisplay) digipinDisplay.textContent = errorMessage;
            alert(errorMessage);
          }
        );
      } else {
        const noGeoMessage = "Geolocation is not supported by this browser.";
        console.error(noGeoMessage);
        if (digipinDisplay) digipinDisplay.textContent = noGeoMessage;
        alert(noGeoMessage);
      }
    });
  }

  const digipinInput = document.getElementById('digipin-input');
  const decodeButton = document.getElementById('decode-button');

  if (decodeButton && digipinInput) {
    decodeButton.addEventListener('click', async () => {
      if (!map) { // Check if map is ready
        alert("Map is not ready. Please wait or refresh.");
        return;
      }
      const digipinValue = digipinInput.value.trim();
      if (!digipinValue) {
        alert("Please enter a DIGIPIN to decode.");
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/digipin/decode?digipin=${encodeURIComponent(digipinValue)}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        if (isNaN(lat) || isNaN(lng)) {
            throw new Error("Invalid coordinates received from decode API.");
        }
        // Check if decoded coordinates are within India before showing on map
        if (isPointInIndia(lat, lng)) {
            fetchDigipinAndDisplayMap(lat, lng);
        } else {
            alert("The decoded DIGIPIN location is outside India.");
            if (digipinDisplay) digipinDisplay.textContent = "Decoded location is outside India.";
        }
      } catch (error) {
        console.error('Error decoding DIGIPIN:', error);
        if (digipinDisplay) digipinDisplay.textContent = 'Error decoding DIGIPIN: ' + error.message;
        alert('Error decoding DIGIPIN: ' + error.message);
      }
    });
  }

  const latInput = document.getElementById('lat-input');
  const lonInput = document.getElementById('lon-input');
  const coordsToDigipinButton = document.getElementById('coords-to-digipin-button');

  if (coordsToDigipinButton && latInput && lonInput) {
    coordsToDigipinButton.addEventListener('click', () => {
      if (!map || !INDIA_GEOJSON_DATA) { // Check if map and data are ready
        alert("Map or boundary data is not ready. Please wait or refresh.");
        return;
      }
      const latValue = latInput.value.trim();
      const lonValue = lonInput.value.trim();
      if (latValue === '' || lonValue === '') {
        alert("Please enter both Latitude and Longitude."); return;
      }
      const latitude = parseFloat(latValue);
      const longitude = parseFloat(lonValue);
      if (isNaN(latitude) || isNaN(longitude)) {
        alert("Latitude and Longitude must be valid numbers."); return;
      }
      if (latitude < -90 || latitude > 90) {
        alert("Latitude must be between -90 and 90."); return;
      }
      if (longitude < -180 || longitude > 180) {
        alert("Longitude must be between -180 and 180."); return;
      }
      if (isPointInIndia(latitude, longitude)) {
        fetchDigipinAndDisplayMap(latitude, longitude);
      } else {
        alert("The provided coordinates are outside India. Please provide coordinates within India.");
      }
    });
  }
});
