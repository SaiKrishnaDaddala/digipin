// Global map variable to avoid re-initialization issues
let map;

function initMap() {
  // This function is called by the Google Maps API script.
  // We don't need to do much here if Leaflet handles map display,
  // but it's required by the Google Maps script.
  console.log("Google Maps API initialized.");
}

function geocodeAddress(address) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ 'address': address }, (results, status) => {
    if (status === 'OK') {
      const latitude = results[0].geometry.location.lat();
      const longitude = results[0].geometry.location.lng();
      fetchDigipinAndDisplayMap(latitude, longitude);
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
      document.getElementById('digipin-display').textContent = 'Failed to geocode address.';
    }
  });
}

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

    // Initialize or update map
    if (map) {
        map.setView([latitude, longitude], 13);
    } else {
        map = L.map('map-container').setView([latitude, longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    L.marker([latitude, longitude]).addTo(map)
      .bindPopup('DIGIPIN: ' + digipin)
      .openPopup();

  } catch (error) {
    console.error('Error fetching DIGIPIN or displaying map:', error);
    digipinDisplay.textContent = 'Error: ' + error.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('search-button');
  const addressInput = document.getElementById('address-input');

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const address = addressInput.value;
      if (address) {
        // Check if Google Maps API is loaded
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
          geocodeAddress(address);
        } else {
          alert('Google Maps API is not loaded. Please ensure you have a valid API key and internet connection.');
          document.getElementById('digipin-display').textContent = 'Google Maps API not loaded.';
        }
      } else {
        alert('Please enter an address.');
      }
    });
  }
});
