document.addEventListener('DOMContentLoaded', () => {
    const viewerDigipinEl = document.getElementById('viewer-digipin');
    const viewerLatEl = document.getElementById('viewer-lat');
    const viewerLonEl = document.getElementById('viewer-lon');
    const viewerQrcodeEl = document.getElementById('viewer-qrcode');
    const openGoogleMapsBtnEl = document.getElementById('open-google-maps-btn');
    const mapViewerEl = document.getElementById('map-viewer'); // Map container
    const infoPanelEl = document.getElementById('info-panel'); // For displaying errors

    if (!viewerDigipinEl || !viewerLatEl || !viewerLonEl || !viewerQrcodeEl || !openGoogleMapsBtnEl || !mapViewerEl || !infoPanelEl) {
        console.error('One or more essential viewer elements are missing from the DOM.');
        if(infoPanelEl) infoPanelEl.innerHTML = '<p style="color:red;">Error: Page structure is missing essential elements. Cannot display location.</p>';
        return;
    }

    // Extract DIGIPIN from the URL path
    const pathParts = window.location.pathname.split('/');
    const digipin = pathParts[pathParts.length - 1];

    if (!digipin || digipin.toLowerCase() === 'pin' || digipin.trim() === '') {
        console.error('DIGIPIN not found in URL path.');
        infoPanelEl.innerHTML = '<p style="color:red;">Error: DIGIPIN not found in the URL. Please check the link.</p>';
        viewerDigipinEl.textContent = 'Error';
        viewerLatEl.textContent = 'N/A';
        viewerLonEl.textContent = 'N/A';
        return;
    }

    viewerDigipinEl.textContent = digipin;

    // Fetch coordinates for the DIGIPIN
    // Assuming API_BASE_URL is '' for relative paths, or define if needed.
    // The API route is /api/digipin/decode as per existing project structure.
    fetch(`/api/digipin/decode?digipin=${encodeURIComponent(digipin)}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
                }).catch(() => {
                    // If parsing errorData as JSON fails or if it's not JSON
                    throw new Error(`HTTP error! status: ${response.status}. Could not retrieve error details.`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.error || !data.latitude || !data.longitude) {
                throw new Error(data.error || 'Invalid DIGIPIN or data format from API.');
            }

            const latitude = parseFloat(data.latitude);
            const longitude = parseFloat(data.longitude);

            viewerLatEl.textContent = latitude.toFixed(6);
            viewerLonEl.textContent = longitude.toFixed(6);

            // Initialize Leaflet map
            const map = L.map(mapViewerEl).setView([latitude, longitude], 13); // Use specific map container ID
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            L.marker([latitude, longitude]).addTo(map)
                .bindPopup(`DIGIPIN: ${digipin}<br>Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`)
                .openPopup();

            // Generate QR code for the current page's URL
            if (typeof QRCode !== 'undefined') {
                viewerQrcodeEl.innerHTML = ''; // Clear previous if any
                new QRCode(viewerQrcodeEl, {
                    text: window.location.href,
                    width: 150,
                    height: 150,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            } else {
                console.error("QRCode library not loaded. Cannot generate QR code.");
                viewerQrcodeEl.textContent = 'QR Code library not loaded.';
            }


            // Setup "Open in Google Maps" button
            openGoogleMapsBtnEl.addEventListener('click', () => {
                const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                window.open(googleMapsUrl, '_blank');
            });

        })
        .catch(error => {
            console.error('Error fetching or processing DIGIPIN:', error);
            infoPanelEl.innerHTML = `<p style="color:red;">Error: Could not load location for DIGIPIN "${digipin}". ${error.message}</p>`;
            viewerLatEl.textContent = 'Error';
            viewerLonEl.textContent = 'Error';
        });
});
