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
  console.log(`isPointInIndia: Checking lat: ${latitude}, lng: ${longitude}`);

  if (!INDIA_GEOJSON_DATA) { // Combined null/undefined check for INDIA_GEOJSON_DATA itself
    console.error("isPointInIndia: INDIA_GEOJSON_DATA is null or undefined.");
    return false;
  }

  console.log('isPointInIndia: INDIA_GEOJSON_DATA type:', INDIA_GEOJSON_DATA.type);
  if (INDIA_GEOJSON_DATA.type === 'FeatureCollection') {
    console.log('isPointInIndia: FeatureCollection length:', INDIA_GEOJSON_DATA.features ? INDIA_GEOJSON_DATA.features.length : 'undefined features');
  }

  if (!INDIA_GEOJSON_DATA.features || INDIA_GEOJSON_DATA.features.length === 0) {
    console.error("isPointInIndia: INDIA_GEOJSON_DATA.features is not loaded or is empty.");
    return false;
  }

  const point = turf.point([longitude, latitude]); // Create point once

  console.log("isPointInIndia: Iterating through features for point-in-polygon check...");
  for (let i = 0; i < INDIA_GEOJSON_DATA.features.length; i++) {
    const feature = INDIA_GEOJSON_DATA.features[i];

    if (!feature || !feature.geometry) {
      console.warn(`isPointInIndia: Skipping feature at index ${i} due to missing geometry.`);
      continue;
    }

    let geometryForCheck = feature.geometry;
    console.log(`isPointInIndia: Checking feature ${i}, type: ${geometryForCheck.type}`);

    if (geometryForCheck.type === 'Polygon' || geometryForCheck.type === 'MultiPolygon') {
      if (turf.booleanPointInPolygon(point, geometryForCheck)) {
        console.log(`isPointInIndia: Point found in feature ${i} (${geometryForCheck.type}).`);
        // Debugging test case for Delhi (adjust if necessary, or remove for general use)
        // This specific test might be less relevant here if not all features are Delhi.
        if (typeof turf !== 'undefined' && geometryForCheck) {
          // console.log("Delhi test on current feature:", turf.booleanPointInPolygon(turf.point([77.216721, 28.644800]), geometryForCheck));
        }
        return true; // Point is in this feature
      }
    } else {
      console.warn(`isPointInIndia: Skipping feature ${i} due to unsupported geometry type: ${geometryForCheck.type}`);
    }
  }

  console.log("isPointInIndia: Point not found in any features.");
  return false; // Point not found in any of the features
}

function getPopupContentHTML(digipin, latitude, longitude, accuracy) {
  const latitude_formatted = parseFloat(latitude).toFixed(6);
  const longitude_formatted = parseFloat(longitude).toFixed(6);
  const accuracy_formatted = accuracy ? `${parseFloat(accuracy).toFixed(1)} m` : 'N/A';

  return `
    <div class="custom-popup">
        <h4>Your DIGIPIN</h4>
        <p class="digipin-value">${digipin}</p>
        <p class="coords">Lat: ${latitude_formatted}, Lon: ${longitude_formatted}</p>
        <p class="accuracy">Location accuracy: ${accuracy_formatted}</p>
        <div class="popup-actions">
            <button id="popup-copy-btn" class="popup-action-button" title="Copy">📋 Copy</button>
            <button id="popup-share-btn" class="popup-action-button" title="Share">🔗 Share</button>
            <button id="popup-qr-btn" class="popup-action-button" title="QR Code">🏁 QR</button>
            <button id="popup-speak-btn" class="popup-action-button" title="Read Aloud">🔊 Speak</button>
        </div>
    </div>
  `;
}

async function fetchDigipinAndDisplayMap(latitude, longitude, accuracy = null) {
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

    const marker = L.marker([latitude, longitude]).addTo(map);
    const htmlContent = getPopupContentHTML(digipin, latitude, longitude, accuracy);
    marker.bindPopup(htmlContent).openPopup();

    marker.on('popupopen', function (e) {
        // 'e.popup' gives access to the popup DOM element if needed,
        // but document.getElementById should work as IDs are unique.
        console.log('Popup opened. Setting up button listeners...');

        const copyButton = document.getElementById('popup-copy-btn');
        if (copyButton) {
          copyButton.addEventListener('click', () => {
            const lat_formatted = parseFloat(latitude).toFixed(6);
            const lon_formatted = parseFloat(longitude).toFixed(6);
            const acc_formatted = accuracy ? `${parseFloat(accuracy).toFixed(1)} m` : 'N/A';
            const textToCopy = `Your DIGIPIN: ${digipin}\nCoordinates: ${lat_formatted}, ${lon_formatted}\nLocation accuracy: ${acc_formatted}`;

            navigator.clipboard.writeText(textToCopy)
              .then(() => {
                copyButton.textContent = '📋 Copied!';
                setTimeout(() => {
                  copyButton.textContent = '📋 Copy';
                }, 2000);
              })
              .catch(err => {
                console.error('Error copying text: ', err);
                alert('Failed to copy details. See console for error.');
              });
          });
        }

        const shareButton = document.getElementById('popup-share-btn');
        if (shareButton) {
          shareButton.addEventListener('click', async () => {
            const shareUrl = `http://localhost:5000/pin/${digipin}`; // Placeholder base URL for now
            const shareData = {
              title: 'My DIGIPIN Location',
              text: `Check out this location: ${digipin}`,
              url: shareUrl,
            };

            if (navigator.share) {
              try {
                await navigator.share(shareData);
                console.log('DIGIPIN shared successfully');
              } catch (err) {
                console.error('Error sharing DIGIPIN:', err);
                // Fallback if share fails, or just inform user.
                // For this example, we'll try to copy the URL as a fallback.
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  alert('Sharing failed, link copied to clipboard: ' + shareUrl);
                } catch (copyErr) {
                  console.error('Error copying share URL to clipboard:', copyErr);
                  alert('Failed to share or copy link.');
                }
              }
            } else {
              // Fallback if navigator.share is not supported
              try {
                await navigator.clipboard.writeText(shareUrl);
                alert('Sharing not supported, link copied to clipboard: ' + shareUrl);
              } catch (err) {
                console.error('Error copying share URL to clipboard:', err);
                alert('Failed to copy link. Please copy it manually: ' + shareUrl);
              }
            }
          });
        }

        const qrButton = document.getElementById('popup-qr-btn');
        const qrModal = document.getElementById('qr-modal');
        const qrCodeDisplay = document.getElementById('qrcode-display');
        const qrLinkText = document.getElementById('qr-link-text');
        const qrModalCloseBtn = document.getElementById('qr-modal-close-btn');

        if (qrButton && qrModal && qrCodeDisplay && qrLinkText && qrModalCloseBtn) {
          qrButton.addEventListener('click', () => {
            if (typeof QRCode === 'undefined') {
              alert('QR Code library not loaded.');
              return;
            }
            const shareUrl = `http://localhost:5000/pin/${digipin}`; // Consistent with share functionality

            qrCodeDisplay.innerHTML = ''; // Clear previous QR code
            new QRCode(qrCodeDisplay, {
              text: shareUrl,
              width: 200,
              height: 200,
              colorDark : "#000000",
              colorLight : "#ffffff",
              correctLevel : QRCode.CorrectLevel.H
            });
            qrLinkText.textContent = shareUrl;
            qrModal.style.display = 'block';
          });

          qrModalCloseBtn.addEventListener('click', () => {
            qrModal.style.display = 'none';
          });

          // Optional: Close modal if backdrop is clicked
          qrModal.addEventListener('click', (event) => {
            if (event.target == qrModal) {
              qrModal.style.display = 'none';
            }
          });
        } else {
          console.error('QR Code modal elements not found. QR functionality disabled for this popup.');
        }

        const speakButton = document.getElementById('popup-speak-btn');
        if (speakButton) {
          speakButton.addEventListener('click', () => {
            if ('speechSynthesis' in window) {
              const lat_formatted = parseFloat(latitude).toFixed(2); // Shorter format for speech
              const lon_formatted = parseFloat(longitude).toFixed(2);
              let acc_speech = 'Accuracy not available.';
              if (accuracy) {
                acc_speech = `Accuracy: ${parseFloat(accuracy).toFixed(0)} meters.`;
              }

              const textToSpeak = `DIGIPIN: ${digipin.replace(/-/g, ' ')}. Latitude: ${lat_formatted}. Longitude: ${lon_formatted}. ${acc_speech}`;

              window.speechSynthesis.cancel(); // Cancel any ongoing speech
              const utterance = new SpeechSynthesisUtterance(textToSpeak);
              utterance.lang = 'en-IN'; // Prioritize Indian English if available
              window.speechSynthesis.speak(utterance);
            } else {
              alert('Sorry, your browser does not support text-to-speech.');
            }
          });
        }
    });

  } catch (error) {
    console.error('Error fetching DIGIPIN or displaying map:', error);
    if (digipinDisplay) digipinDisplay.textContent = 'Error: ' + error.message;
  }
}

function initializeMapFeatures() {
  // Temporary test with user-provided coordinates
  if (INDIA_GEOJSON_DATA) { // Ensure data is loaded
    console.log("--- Test Case 1 (User-provided) ---");
    isPointInIndia(21.858226543132226, 77.73925781250001);
    console.log("--- End Test Case 1 ---");

    console.log("--- Test Case 2 (User-provided) ---");
    isPointInIndia(22.75215845553594, 77.34375000000001);
    console.log("--- End Test Case 2 ---");
  }

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
            const accuracyValue = position.coords.accuracy; // Get accuracy
            if (isPointInIndia(latitude, longitude)) {
              fetchDigipinAndDisplayMap(latitude, longitude, accuracyValue); // Pass accuracy
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
