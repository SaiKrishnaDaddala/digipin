QUnit.module('Frontend Elements', function() {
  QUnit.test('Essential HTML elements exist', function(assert) {
    assert.ok(document.getElementById('address-input'), 'Address input exists');
    assert.ok(document.getElementById('search-button'), 'Search button exists');
    assert.ok(document.getElementById('map-container'), 'Map container exists');
    assert.ok(document.getElementById('digipin-display'), 'DIGIPIN display area exists');
  });
});

QUnit.module('Address Search Functionality', function(hooks) {
  hooks.beforeEach(function() {
    // Reset elements if needed, e.g., input value, display text
    document.getElementById('address-input').value = '';
    document.getElementById('digipin-display').textContent = '';
    // Mock global fetch if your function uses it
    this.originalFetch = window.fetch;
    window.fetch = async function(url) {
      console.log('Mock fetch called for URL:', url);
      if (url.includes('/api/digipin/encode')) {
        return {
          ok: true,
          json: async () => ({ digipin: 'TEST-PIN-123' })
        };
      }
      return { ok: false, json: async () => ({ error: 'Mock fetch error' }) };
    };
  });

  hooks.afterEach(function() {
    // Restore original fetch
    window.fetch = this.originalFetch;
  });

  QUnit.test('Search button click triggers geocoding and digipin fetch', function(assert) {
    const done = assert.async();
    const addressInput = document.getElementById('address-input');
    const searchButton = document.getElementById('search-button');
    const digipinDisplay = document.getElementById('digipin-display');

    addressInput.value = 'Test Address';
    searchButton.click();

    // Need to wait for async operations (geocoding, fetch)
    setTimeout(() => {
      // Check if geocoder was called (via console log from stub or by side effect)
      // For this setup, we check the digipin display
      assert.ok(digipinDisplay.textContent.includes('TEST-PIN-123'), 'DIGIPIN display is updated after search');
      done();
    }, 500); // Adjust timeout as necessary
  });

  QUnit.test('Empty address shows alert (manual check, or spy on alert)', function(assert) {
    // QUnit doesn't easily spy on window.alert. This is more of an integration test.
    // We'll check that the display wasn't updated.
    const originalAlert = window.alert;
    let alertCalled = false;
    window.alert = function(message) {
      alertCalled = true;
      console.log("Mock alert:", message);
    };

    const searchButton = document.getElementById('search-button');
    const digipinDisplay = document.getElementById('digipin-display');
    document.getElementById('address-input').value = ''; // Empty address

    searchButton.click();

    assert.ok(alertCalled, "Alert was called for empty address");
    assert.equal(digipinDisplay.textContent, '', 'DIGIPIN display remains empty for empty address search');

    window.alert = originalAlert; // Restore original alert
  });
});
