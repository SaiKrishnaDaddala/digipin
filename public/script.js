// public/script.js
const API_BASE_URL = ''; // Keep this as is

// GeoJSON data for India's boundary (truncated for brevity, full data should be used)
const INDIA_GEOJSON = {"type":"FeatureCollection","features":[
{"type":"Feature","id":"IND","properties":{"name":"India"},"geometry":{"type":"P
olygon","coordinates":[[[77.837451,35.49401],[78.912269,34.321936],[78.811086,33
.506198],[79.208892,32.994395],[79.176129,32.48378],[78.458446,32.618164],[78.73
8894,31.515906],[79.721367,30.882715],[81.111256,30.183481],[80.476721,29.729865
],[80.088425,28.79447],[81.057203,28.416095],[81.999987,27.925479],[83.304249,27
.364506],[84.675018,27.234901],[85.251779,26.726198],[86.024393,26.630985],[87.2
227472,26.397898],[88.060238,26.414615],[88.174804,26.810405],[88.043133,27.44581
9],[88.120441,27.876542],[88.730326,28.086865],[88.814248,27.299316],[88.835643,
27.098966],[89.744528,26.719403],[90.373275,26.875724],[91.217513,26.808648],[92
.033484,26.83831],[92.103712,27.452614],[91.696657,27.771742],[92.503119,27.8968
76],[93.413348,28.640629],[94.56599,29.277438],[95.404802,29.031717],[96.117679,
29.452802],[96.586591,28.83098],[96.248833,28.411031],[97.327114,28.261583],[97.
402561,27.882536],[97.051989,27.699059],[97.133999,27.083774],[96.419366,27.2645
89],[95.124768,26.573572],[95.155153,26.001307],[94.603249,25.162495],[94.552658
,24.675238],[94.106742,23.850741],[93.325188,24.078556],[93.286327,23.043658],[9
3.060294,22.703111],[93.166128,22.27846],[92.672721,22.041239],[92.146035,23.627
499],[91.869928,23.624346],[91.706475,22.985264],[91.158963,23.503527],[91.46773
,24.072639],[91.915093,24.130414],[92.376202,24.976693],[91.799596,25.147432],[9
0.872211,25.132601],[89.920693,25.26975],[89.832481,25.965082],[89.355094,26.014
407],[88.563049,26.446526],[88.209789,25.768066],[88.931554,25.238692],[88.30637
3,24.866079],[88.084422,24.501657],[88.69994,24.233715],[88.52977,23.631142],[88
.876312,22.879146],[89.031961,22.055708],[88.888766,21.690588],[88.208497,21.703
172],[86.975704,21.495562],[87.033169,20.743308],[86.499351,20.151638],[85.06026
6,19.478579],[83.941006,18.30201],[83.189217,17.671221],[82.192792,17.016636],[8
2.191242,16.556664],[81.692719,16.310219],[80.791999,15.951972],[80.324896,15.89
9185],[80.025069,15.136415],[80.233274,13.835771],[80.286294,13.006261],[79.8625
47,12.056215],[79.857999,10.357275],[79.340512,10.308854],[78.885345,9.546136],[
79.18972,9.216544],[78.277941,8.933047],[77.941165,8.252959],[77.539898,7.965535
],[76.592979,8.899276],[76.130061,10.29963],[75.746467,11.308251],[75.396101,11.
781245],[74.864816,12.741936],[74.616717,13.992583],[74.443859,14.617222],[73.53
4199,15.990652],[73.119909,17.92857],[72.820909,19.208234],[72.824475,20.419503]
,[72.630533,21.356009],[71.175273,20.757441],[70.470459,20.877331],[69.16413,22.
089298],[69.644928,22.450775],[69.349597,22.84318],[68.176645,23.691965],[68.842
599,24.359134],[71.04324,24.356524],[70.844699,25.215102],[70.282873,25.722229],
[70.168927,26.491872],[69.514393,26.940966],[70.616496,27.989196],[71.777666,27.
91318],[72.823752,28.961592],[73.450638,29.976413],[74.42138,30.979815],[74.4059
29,31.692639],[75.258642,32.271105],[74.451559,32.7649],[74.104294,33.441473],[7
3.749948,34.317699],[74.240203,34.748887],[75.757061,34.504923],[76.871722,34.65
3544],[77.837451,35.49401]]]}}
]}; // Full GeoJSON data here

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
  if (!INDIA_GEOJSON || !INDIA_GEOJSON.features || INDIA_GEOJSON.features.length === 0) {
    console.error("India GeoJSON data is not loaded or invalid.");
    return false; // Failsafe: if data is missing, consider it outside
  }
  // Assuming the first feature is the Polygon/MultiPolygon for India
  const indiaPolygon = INDIA_GEOJSON.features[0];
  const point = turf.point([longitude, latitude]); // Turf.js expects [lng, lat]
  return turf.booleanPointInPolygon(point, indiaPolygon);
}


async function fetchDigipinAndDisplayMap(latitude, longitude) {
  const digipinDisplay = document.getElementById('digipin-display');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/digipin/encode?latitude=${latitude}&longitude=${longitude}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const digipin = data.digipin;

    digipinDisplay.textContent = 'DIGIPIN: ' + digipin; // Placeholder, to be enhanced

    // Map initialization and marker logic (ensure it's robust)
    if (!map) { // Initialize map only once
        map = L.map('map-container').setView([latitude, longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add geocoder after map is initialized the first time
        geocoderControl = L.Control.geocoder({
            defaultMarkGeocode: false,
            geocodingQueryParams: {
                'countrycodes': 'in',
                'accept-language': 'en'
            }
        })
        .on('markgeocode', function(e) {
            const center = e.geocode.center;
            fetchDigipinAndDisplayMap(center.lat, center.lng);
        })
        .addTo(map);

        // Add map click listener only once after map is initialized
        map.on('click', function(e) {
            // Check if click is within India bounds (to be added in next step)
            // For now, directly fetch
            const map_latitude = e.latlng.lat;
            const map_longitude = e.latlng.lng;
            console.log(`Map clicked at: Lat: ${map_latitude}, Lng: ${map_longitude}`);
            fetchDigipinAndDisplayMap(map_latitude, map_longitude);
        });
    } else {
        map.setView([latitude, longitude], 13);
    }

    // Clear previous markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    L.marker([latitude, longitude]).addTo(map)
      .bindPopup('DIGIPIN: ' + digipin) // This will be enhanced in a later step
      .openPopup();

  } catch (error) {
    console.error('Error fetching DIGIPIN or displaying map:', error);
    if (digipinDisplay) digipinDisplay.textContent = 'Error: ' + error.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize map on load - this will also set up the geocoder and map click listener
  // by calling fetchDigipinAndDisplayMap, which has the initialization logic.
  // To prevent an immediate fetch, we can initialize map separately here first.

  map = L.map('map-container').setView([20.5937, 78.9629], 5); // Default view (e.g., India)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add India boundary GeoJSON layer
  if (INDIA_GEOJSON && INDIA_GEOJSON.features && INDIA_GEOJSON.features.length > 0) {
    L.geoJSON(INDIA_GEOJSON, { style: indiaBoundaryStyle }).addTo(map);
  } else {
    console.error("India GeoJSON data is not available to display on map.");
  }

  geocoderControl = L.Control.geocoder({
      defaultMarkGeocode: false,
      geocodingQueryParams: {
        'countrycodes': 'in',
        'accept-language': 'en'
      }
  })
  .on('markgeocode', function(e) {
      const center = e.geocode.center;
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

  const useLocationButton = document.getElementById('use-location-button');
  const digipinDisplay = document.getElementById('digipin-display');

  if (useLocationButton) {
    useLocationButton.addEventListener('click', () => {
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
            // ... (error handling as before)
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
      const digipinValue = digipinInput.value.trim();
      if (!digipinValue) {
        alert("Please enter a DIGIPIN to decode.");
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/digipin/decode?digipin=${encodeURIComponent(digipinValue)}`);
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
        fetchDigipinAndDisplayMap(lat, lng);
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
