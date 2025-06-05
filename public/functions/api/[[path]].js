// public/functions/api/[[path]].js

// IMPORTANT: Replace this with your actual deployed DIGIPIN API Worker URL
const DIGIPIN_API_WORKER_URL = 'https://digipin-api-worker.YOUR_ACCOUNT.workers.dev'; // Placeholder

export async function onRequest(context) {
  // Get the original request's URL
  const url = new URL(context.request.url);

  // The 'path' parameter from [[path]].js contains the matched path segments
  // context.params.path is an array of path segments
  const apiPath = context.params.path.join('/');

  // Construct the target URL for the DIGIPIN API Worker
  const targetUrl = `${DIGIPIN_API_WORKER_URL}/api/${apiPath}${url.search}`; // Append query string

  // Create a new request to the target worker, copying method, headers, and body
  const newRequest = new Request(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.method !== 'GET' && context.request.method !== 'HEAD' ? await context.request.blob() : null,
    redirect: 'follow' // Or 'manual' if you want to handle redirects explicitly
  });

  try {
    // Fetch the response from the DIGIPIN API Worker
    const response = await fetch(newRequest);
    return response; // Return the worker's response to the client
  } catch (error) {
    console.error('Error proxying request to DIGIPIN API Worker:', error);
    return new Response('Error proxying API request', { status: 500 });
  }
}
