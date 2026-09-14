/**
 * Google Sheet Configuration
 * IMPORTANT: Replace the URL below with your actual Google Apps Script Web App URL.
 * 
 * Steps to get the URL:
 * 1. Open your Google Apps Script project linked to your Sheet.
 * 2. Click "Deploy" > "New Deployment" (or Manage Deployments > Edit existing).
 * 3. Select type: "Web app".
 * 4. Description: e.g., "Store App v1".
 * 5. Execute as: "Me" (your email).
 * 6. Who has access: "Anyone" (CRITICAL for CORS to work somewhat better, though Apps Script handles redirects).
 * 7. Click "Deploy".
 * 8. Copy the "Web app URL" (it ends with /exec).
 * 9. Paste it below inside the quotes.
 */

window.GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'; 
// Example: 'https://script.google.com/macros/s/AKfycbx.../exec'

// Fallback to LocalStorage if Sheet fails
window.USE_LOCAL_STORAGE_FALLBACK = true;
