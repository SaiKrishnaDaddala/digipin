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
    *   `https://<YOUR_WORKER_URL>/` - Should show "DIGIPIN API Worker (v1) is running..."
    *   (Note: The root path message in worker.js might have changed, ensure this matches the current message from `worker.js` if it's not serving `index.html` by default)
    *   `https://<YOUR_WORKER_URL>/api/digipin/encode?latitude=12.9716&longitude=77.5946`
    *   `https://<YOUR_WORKER_URL>/api/digipin/decode?digipin=YOUR-TEST-PIN` (replace with a valid pin)

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

This setup leverages Cloudflare Pages for serving the static frontend and its Functions feature for seamlessly proxying API requests to a Cloudflare Worker running the backend logic.
