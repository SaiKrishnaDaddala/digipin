let map;
let geocoderControl; // Store the geocoder control instance

// (Keep the existing fetchDigipinAndDisplayMap function, ensure it handles map re-centering and marker updates)
async function fetchDigipinAndDisplayMap(latitude, longitude) {
  const digipinDisplay = document.getElementById('digipin-display');
  try {
    const response = await fetch(`/api/digipin/encode?latitude=${latitude}&longitude=${longitude}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const digipin = data.digipin;

    digipinDisplay.textContent = 'DIGIPIN: ' + digipin;

    if (!map) { // Initialize map only if it doesn't exist
      map = L.map('map-container').setView([latitude, longitude], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Initialize Geocoder Control and add to map
      geocoderControl = L.Control.geocoder({
        defaultMarkGeocode: false // We'll handle the marker placement
      })
      .on('markgeocode', function(e) {
        const center = e.geocode.center;
        // Call fetchDigipinAndDisplayMap with new coordinates from geocoding result
        fetchDigipinAndDisplayMap(center.lat, center.lng);
      })
      .addTo(map);

    } else {
      map.setView([latitude, longitude], 13);
    }

    // Remove previous markers if any (optional, or manage markers array)
    // For simplicity, clear all markers before adding a new one for now
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
    digipinDisplay.textContent = 'Error: ' + error.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the map without specific coordinates on load, or with a default view.
  // The geocoder will trigger the first call to fetchDigipinAndDisplayMap.
  // Or, we can call fetchDigipinAndDisplayMap with a default location.
  // For now, let map be initialized when first needed by fetchDigipinAndDisplayMap.

  // Placeholder: Call fetchDigipinAndDisplayMap with a default location to initialize the map on load
  // This helps ensure the geocoder control is added to an existing map.
  // Alternatively, map initialization can be done separately.
  // Let's try initializing the map with a default view and add the geocoder.

  map = L.map('map-container').setView([20.5937, 78.9629], 5); // Default view (e.g., India)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  geocoderControl = L.Control.geocoder({
      defaultMarkGeocode: false // We handle the marker and DIGIPIN fetching
  })
  .on('markgeocode', function(e) {
      const center = e.geocode.center;
      fetchDigipinAndDisplayMap(center.lat, center.lng);
  })
  .addTo(map);

  // "Use My Location" button functionality
  const useLocationButton = document.getElementById('use-location-button');
  const digipinDisplay = document.getElementById('digipin-display'); // For error messages

  if (useLocationButton) {
    useLocationButton.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            fetchDigipinAndDisplayMap(latitude, longitude);
          },
          (error) => {
            let errorMessage = 'Error getting location: ';
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += "User denied the request for Geolocation.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += "Location information is unavailable.";
                break;
              case error.TIMEOUT:
                errorMessage += "The request to get user location timed out.";
                break;
              case error.UNKNOWN_ERROR:
                errorMessage += "An unknown error occurred.";
                break;
            }
            console.error(errorMessage);
            if (digipinDisplay) digipinDisplay.textContent = errorMessage;
            alert(errorMessage); // Also alert for immediate feedback
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

  // Add map click listener after map is initialized
  if (map) {
    map.on('click', function(e) {
      const latitude = e.latlng.lat;
      const longitude = e.latlng.lng;
      // Optional: you might want to add a small visual confirmation or delay
      // if fetchDigipinAndDisplayMap takes time, but for now, direct call.
      console.log(`Map clicked at: Lat: ${latitude}, Lng: ${longitude}`);
      fetchDigipinAndDisplayMap(latitude, longitude);
    });
  }

  const digipinInput = document.getElementById('digipin-input');
  const decodeButton = document.getElementById('decode-button');
  // const digipinDisplay = document.getElementById('digipin-display'); // Already declared above for useLocationButton

  if (decodeButton && digipinInput) {
    decodeButton.addEventListener('click', async () => {
      const digipinValue = digipinInput.value.trim();
      if (!digipinValue) {
        alert("Please enter a DIGIPIN to decode.");
        return;
      }

      try {
        const response = await fetch(`/api/digipin/decode?digipin=${encodeURIComponent(digipinValue)}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // data should contain { latitude: "...", longitude: "..." }
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);

        if (isNaN(lat) || isNaN(lng)) {
            throw new Error("Invalid coordinates received from decode API.");
        }

        // Update the map and marker, and this will also re-fetch/display the DIGIPIN
        fetchDigipinAndDisplayMap(lat, lng);

        // Optionally, display the raw decoded coordinates
        // digipinDisplay.textContent = `Decoded: Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}. DIGIPIN: ...`;
        // fetchDigipinAndDisplayMap will update the digipinDisplay with the re-encoded digipin.

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
  // const digipinDisplay = document.getElementById('digipin-display'); // Already declared

  if (coordsToDigipinButton && latInput && lonInput) {
    coordsToDigipinButton.addEventListener('click', () => {
      const latValue = latInput.value.trim();
      const lonValue = lonInput.value.trim();

      if (latValue === '' || lonValue === '') {
        alert("Please enter both Latitude and Longitude.");
        return;
      }

      const latitude = parseFloat(latValue);
      const longitude = parseFloat(lonValue);

      if (isNaN(latitude) || isNaN(longitude)) {
        alert("Latitude and Longitude must be valid numbers.");
        return;
      }

      if (latitude < -90 || latitude > 90) {
        alert("Latitude must be between -90 and 90.");
        return;
      }
      if (longitude < -180 || longitude > 180) {
        alert("Longitude must be between -180 and 180.");
        return;
      }

      // Backend has more specific bounds (India), but this is general validation.
      // The fetchDigipinAndDisplayMap will call the backend which will validate against its own bounds.
      fetchDigipinAndDisplayMap(latitude, longitude);
    });
  }
});
