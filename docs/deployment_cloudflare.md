# Deploying the DIGIPIN Application to Cloudflare Workers and Pages

This document provides instructions for deploying the DIGIPIN application, which consists of a backend API (Hono.js app) and a static frontend.

## Prerequisites

1.  **Cloudflare Account:** You need an active Cloudflare account.
2.  **Node.js and npm:** Ensure Node.js (which includes npm) is installed on your local machine for managing dependencies and using Wrangler.
3.  **Wrangler CLI:** Install the Cloudflare Wrangler CLI: `npm install -g wrangler`. Log in with your Cloudflare account: `wrangler login`.
4.  **Git:** The project should be managed with Git, especially for Cloudflare Pages deployment.
5.  **Project Files:** You should have the complete project code, including:
    *   `worker.js` (Hono.js backend API)
    *   `src/digipin.js` (Core DIGIPIN logic)
    *   `wrangler.toml` (Worker configuration)
    *   `public/` directory (Frontend static assets: `index.html`, `script.js`, `style.css`, etc.)
    *   `public/functions/api/[[path]].js` (Pages API proxy function)
    *   `package.json` (with `hono` listed as a dependency)

## Part 1: Deploying the Backend API to Cloudflare Workers

The backend API is defined in `worker.js` and uses Hono.js.

1.  **Install Dependencies:**
    If you haven't already, install Hono.js:
    ```bash
    npm install hono
    ```

2.  **Configure `wrangler.toml`:**
    *   Open `wrangler.toml`.
    *   **Important:** Change the `name` field to a unique name for your worker (e.g., `name = "my-unique-digipin-api"`). This will form part of its URL (e.g., `my-unique-digipin-api.yourusername.workers.dev`).
    *   Ensure `main = "worker.js"` and `compatibility_date` is set.

### 3. Configure Google Geocoding API Key (Mandatory for Google Address Search)

The newly integrated Google Address Search feature requires a Google Geocoding API key. The backend worker (`worker.js`) is configured to use an environment variable named `GOOGLE_API_KEY` for this purpose.

1.  **Obtain a Google Geocoding API Key:**
    *   Go to the Google Cloud Console.
    *   Create a new project or select an existing one.
    *   Enable the "Geocoding API" for your project.
    *   Create an API key under "Credentials". Make sure to restrict this API key to only allow the "Geocoding API" and, if possible, restrict it to the domain your worker will run on (though this can be tricky with `workers.dev` subdomains, so start with API service restriction).
    *   For detailed steps, visit: [https://developers.google.com/maps/documentation/geocoding/get-api-key](https://developers.google.com/maps/documentation/geocoding/get-api-key)

2.  **Set the API Key as a Secret for Your Worker:**
    Use the Wrangler CLI to set the API key as a secret for your worker. Secrets are environment variables that are encrypted and securely stored.
    Replace `YOUR_API_KEY_VALUE` with the actual key you obtained (though the command will prompt you, so you don't type the key directly here).
    ```bash
    npx wrangler secret put GOOGLE_API_KEY
    ```
    Wrangler will prompt you to enter the value for the secret. Paste your API key there.

    This command needs to be run in the directory containing your `wrangler.toml` file. The worker will automatically have access to this secret as `c.env.GOOGLE_API_KEY` at runtime.

4.  **Deploy the Worker:**
    Run the following command in your project's root directory:
    ```bash
    wrangler deploy
    ```
    *   Wrangler will build and deploy your worker.
    *   After successful deployment, Wrangler will output the URL of your deployed worker (e.g., `https://my-unique-digipin-api.yourusername.workers.dev`). **Note this URL.**

5.  **Test the Deployed Worker (Optional):**
    You can test basic functionality by opening these URLs in your browser or using a tool like `curl` or Postman:
    *   `https://<YOUR_WORKER_URL>/` - Should now serve the `index.html` page directly.
    *   (Note: The worker has been updated to embed `index.html` for the `/` route and `location_viewer.html` for `/pin/:digipinId` routes to improve behavior in certain deployment scenarios.)
    *   `https://<YOUR_WORKER_URL>/api/digipin/encode?latitude=12.9716&longitude=77.5946`
    *   `https://<YOUR_WORKER_URL>/api/digipin/decode?digipin=YOUR-TEST-PIN` (replace with a valid pin)
    *   `https://<YOUR_WORKER_URL>/swagger.yaml` - Should return the OpenAPI specification in YAML format.

## Part 2: Deploying the Frontend to Cloudflare Pages

The frontend consists of the static files in the `public/` directory.

1.  **Update API Proxy Function (Important):**
    *   Open `public/functions/api/[[path]].js`.
    *   Locate the line: `const DIGIPIN_API_WORKER_URL = 'https://digipin-api-worker.YOUR_ACCOUNT.workers.dev';`
    *   **Replace the placeholder URL** with the actual URL of your deployed DIGIPIN API Worker that you noted in Part 1, Step 3. For example:
        ```javascript
        const DIGIPIN_API_WORKER_URL = 'https://my-unique-digipin-api.yourusername.workers.dev';
        ```
    (Note: The `GOOGLE_API_KEY` is used directly by the Worker and does not need to be passed through or configured in this Pages API proxy function).
    *   Save the file.

2.  **Commit Changes to Git:**
    Ensure all your latest code, including the updated `public/functions/api/[[path]].js`, is committed to your Git repository.
    ```bash
    git add .
    git commit -m "Configure Pages API proxy and prepare for deployment"
    git push # Push to your GitHub, GitLab, or Bitbucket repository
    ```

3.  **Create a Cloudflare Pages Project:**
    *   Log in to your Cloudflare dashboard.
    *   Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
    *   Select your Git provider and the repository containing your project.
    *   **Build settings:**
        *   **Framework preset:** Select `None` (or `Static HTML` if available and appropriate, but `None` gives more control here).
        *   **Build command:** Leave this blank if you don't have a separate build step for your frontend assets. If you were using tools like Webpack, Parcel, or a static site generator, you'd put your build command here.
        *   **Build output directory:** Set this to `public`. This is crucial as it tells Cloudflare Pages where your static files and the `functions` directory are located.
        *   **Root directory (Advanced):** Leave as `/` unless your project is in a subdirectory of the repository.
    *   **Environment Variables (Build time):** While the frontend itself doesn't require build-time environment variables for this setup, the *backend Worker it communicates with* now requires the `GOOGLE_API_KEY` to be set as a secret (as described in Part 1). Ensure this is done for the Google address search functionality to work.
    *   Click **Save and Deploy**.

4.  **Access Your Deployed Frontend:**
    *   Cloudflare Pages will build and deploy your site.
    *   Once deployed, you'll get a unique URL (e.g., `your-project-name.pages.dev`).
    *   Open this URL in your browser. The frontend should load, and API calls should be proxied through the Pages Function to your Worker.

## Post-Deployment Checks

*   Open your deployed Cloudflare Pages site.
*   Test all functionalities:
    *   Address search (via the new Google address search input and the geocoder on the map).
    *   "Use My Location" button.
    *   Clicking on the map to get a DIGIPIN.
    *   Decoding an existing DIGIPIN.
    *   Getting a DIGIPIN from manually entered coordinates.
*   Check the browser's developer console for any errors if something isn't working.
*   If API calls are failing, double-check:
    *   The `DIGIPIN_API_WORKER_URL` in `public/functions/api/[[path]].js` is correct.
    *   Your DIGIPIN API Worker is running correctly and accessible at its own URL.
    *   There are no CORS issues (the Hono app and Pages Functions proxy should handle this, but it's a common area for problems if configured differently).

## Part 3: Important Notes on API Documentation and Static Asset Serving

This section provides additional details following recent updates to the worker, particularly regarding how API documentation is accessed and how HTML/static assets are served.

### 1. Accessing API Documentation (Swagger)

The OpenAPI specification for the API is provided in a `swagger.yaml` file. This file is now served directly by the Cloudflare Worker at the following path:

*   `https://<YOUR_WORKER_URL>/swagger.yaml`

To use this for interactive API documentation:
1.  Access the URL above to get the raw YAML content.
2.  Use this URL or downloaded content with your preferred Swagger UI tool (e.g., the online Swagger Editor, a local Swagger UI instance, or other API development tools).

The previous `/api-docs/` path, which may have served a pre-rendered Swagger UI page in older versions of this project (e.g., when based on Express.js), is **no longer active** with the current Hono.js worker setup.

### 2. Serving of HTML and Static Assets (Addressing `__STATIC_CONTENT_MANIFEST` Issues)

Recent changes were made to how the worker serves `index.html` (for the `/` route) and `location_viewer.html` (for `/pin/:digipinId` routes). These HTML files are now imported as raw strings into `worker.js` and served directly. This change was implemented to prevent `ReferenceError: __STATIC_CONTENT_MANIFEST is not defined` errors that can occur if the Cloudflare Worker is deployed in a "standalone" mode (i.e., not as part of a Cloudflare Pages project with integrated Functions) and `serveStatic` is used for these HTML files.

**Understanding the Recommended Deployment Model (Pages + Worker):**

The primary deployment strategy detailed in this guide (Part 1 and Part 2) is a hybrid approach:
*   **Cloudflare Pages:** Serves your static frontend assets (HTML files like `index.html`, `location_viewer.html`, CSS, client-side JavaScript from `public/script.js`, images, and `public/india_boundary.geojson`) from your project's `public/` directory.
*   **Cloudflare Worker (`worker.js`):** Runs your backend API logic (e.g., `/api/digipin/encode`, `/api/digipin/decode`, `/api/geocode`).
*   **Pages Function (`public/functions/api/[[path]].js`):** Acts as a proxy, forwarding API requests from the frontend (served by Pages) to your backend API Worker. This simplifies API calls from your client-side code and helps manage CORS.

In this recommended model, Cloudflare Pages is responsible for serving `index.html` and `location_viewer.html`. The worker embedding these files is primarily a robustness measure for scenarios where the worker's `/` or `/pin/` paths might be accessed directly.

**Considerations for Static Assets (CSS, JS, GeoJSON):**

The `worker.js` file still includes `serveStatic` calls for specific assets like `/style.css`, `/script.js`, etc.
*   In the **recommended Pages + Worker model**, these routes on the worker might not be actively used if Pages serves these assets first.
*   If you are attempting to deploy `worker.js` as a **truly standalone service** that must also serve all static frontend assets from its own domain (without Cloudflare Pages for the frontend):
    1.  The `serveStatic` calls for these individual assets might also encounter issues (like `__STATIC_CONTENT_MANIFEST` errors or path resolution problems) because the standalone worker environment differs from the integrated Pages environment.
    2.  For a robust standalone worker that serves all its own frontend assets, you would typically need to:
        a.  Configure `wrangler.toml` with a `[site]` section (e.g., `site = { bucket = "./public" }`).
        b.  Ensure `serveStatic` calls are compatible with this setup, potentially by using a single `serveStatic` middleware for all assets from the root if your `[site]` configuration makes them available that way.
        c.  Alternatively, embed all critical assets as raw strings or use KV/R2 storage.
    This advanced standalone configuration is not the primary focus of this deployment guide.

## Part 4: Post-Deployment Checks

*   Open your deployed Cloudflare Pages site.
*   Test all functionalities:
    *   Address search (via the new Google address search input and the geocoder on the map).
    *   "Use My Location" button.
    *   Clicking on the map to get a DIGIPIN.
    *   Decoding an existing DIGIPIN.
    *   Getting a DIGIPIN from manually entered coordinates.
*   Check the browser's developer console for any errors if something isn't working.
*   If API calls are failing, double-check:
    *   The `DIGIPIN_API_WORKER_URL` in `public/functions/api/[[path]].js` is correct.
    *   Your DIGIPIN API Worker is running correctly and accessible at its own URL.
    *   There are no CORS issues (the Hono app and Pages Functions proxy should handle this, but it's a common area for problems if configured differently).

This setup leverages Cloudflare Pages for serving the static frontend and its Functions feature for seamlessly proxying API requests to a Cloudflare Worker running the backend logic.
