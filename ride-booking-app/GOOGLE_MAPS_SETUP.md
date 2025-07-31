# Google Maps API Setup Guide

Your ride booking application is showing a Google Maps error because the API key needs proper configuration. Follow these steps to resolve the issue:

## 1. Google Cloud Console Setup

### Step 1: Create/Access Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### Step 2: Enable Required APIs
Enable these APIs in your Google Cloud Console:
1. **Maps JavaScript API** (Required for map display)
2. **Places API** (Required for address autocomplete)
3. **Directions API** (Required for route calculation)
4. **Geocoding API** (Optional but recommended)

To enable APIs:
1. Go to "APIs & Services" > "Library"
2. Search for each API above
3. Click on each API and press "Enable"

### Step 3: Create API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "+ CREATE CREDENTIALS" > "API key"
3. Copy the generated API key

### Step 4: Configure API Key Restrictions (Recommended)
1. Click on your API key to edit it
2. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add these referrers:
     - `http://localhost:3000/*`
     - `http://localhost:3001/*`
     - `https://yourdomain.com/*` (when you deploy)
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose the APIs you enabled above
4. Save the changes

## 2. Update Your Environment Variables

Replace the API key in your `.env` file:

```env
# Replace with your actual Google Maps API key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
```

## 3. Restart Your Development Server

After updating the `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## 4. Verify Setup

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Refresh your application
4. Look for these messages:
   - "Loading Google Maps with API key: [first 10 characters]..."
   - "Google Maps loaded successfully"

## 5. Common Issues and Solutions

### Issue: "ApiNotActivatedMapError"
**Solution:** Enable the Maps JavaScript API in Google Cloud Console

### Issue: "InvalidKeyMapError"
**Solution:** Check that your API key is correct and has no extra spaces

### Issue: "RefererNotAllowedMapError"
**Solution:** Add your domain to the API key restrictions

### Issue: "QuotaExceededError"
**Solution:** Check your API usage limits and billing settings

## 6. Testing Your Setup

Once configured correctly, you should see:
- ✅ Map loads without errors
- ✅ Address autocomplete works in pickup/dropoff fields
- ✅ Route displays when both addresses are entered
- ✅ Fare calculation works based on distance

## 7. Current API Key Status

Your current API key in `.env`:
```
AIzaSyB0GC7185h1chSDlUmoV0zL-vxHLlLfwlk
```

This key may need to be:
1. Verified as valid
2. Have the required APIs enabled
3. Have proper domain restrictions configured

## Need Help?

If you continue to have issues:
1. Check the browser console for specific error messages
2. Verify your Google Cloud billing is set up
3. Ensure all required APIs are enabled
4. Check API key restrictions match your domain

The application has been updated with better error messages to help diagnose the specific issue.