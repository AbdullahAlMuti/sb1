# Google Sheets Integration - Deployment Guide

## Problem Summary

The Google Sheets integration was failing because:
1. ✅ **FIXED**: Duplicate Edge Functions (`google-sheets-sync` and `google_sheets_sync`)
2. ✅ **FIXED**: Poor error handling in the frontend
3. ⚠️ **ACTION REQUIRED**: Edge Function not deployed to Supabase

## What Was Fixed

### 1. Removed Duplicate Function
- Deleted `supabase/functions/google-sheets-sync` (hyphenated version)
- Kept only `supabase/functions/google_sheets_sync` (underscore version)
- Updated `supabase/config.toml` to remove duplicate configuration

### 2. Improved Error Handling
- Added detailed logging in `useGoogleSheetsSync.tsx`
- Better error messages that indicate if function is not deployed
- Debug information from upstream Google Apps Script responses

## Deployment Steps

### Option 1: Deploy to Supabase Cloud (Recommended)

1. **Login to Supabase CLI**:
   ```bash
   npx supabase login
   ```

2. **Deploy the Edge Function**:
   ```bash
   npx supabase functions deploy google_sheets_sync --project-ref ojxzssooylmydystjvdo
   ```

3. **Verify Deployment**:
   - Go to https://supabase.com/dashboard/project/ojxzssooylmydystjvdo/functions
   - Check that `google_sheets_sync` is listed and active

### Option 2: Test Locally First

1. **Start Supabase locally**:
   ```bash
   npx supabase start
   ```

2. **Serve the function locally**:
   ```bash
   npx supabase functions serve google_sheets_sync
   ```

3. **Update .env to use local Supabase**:
   ```env
   VITE_SUPABASE_URL="http://localhost:54321"
   VITE_SUPABASE_PUBLISHABLE_KEY="<your-local-anon-key>"
   ```

4. **Test the integration** in your app

5. **Deploy to production** when ready (see Option 1)

## Testing the Integration

1. **Navigate to Settings** in your app
2. **Go to Google Sheets Integration** section
3. **Enter your Google Apps Script URL**
4. **Click "Test"** button
5. **Check the debug details** if it fails

### Expected Success Response:
```json
{
  "success": true,
  "added": 1,
  "skipped": 0,
  "message": "Added 1 rows, skipped 0 duplicates"
}
```

### Common Errors:

#### Error: "Edge Function not deployed"
**Solution**: Deploy the function using Option 1 above

#### Error: "Invalid JWT"
**Solution**: Make sure you're logged in to the app

#### Error: "URL must be a Google Apps Script URL"
**Solution**: Verify your Google Apps Script URL format:
- Must start with `https://script.google.com/macros/s/`
- Must end with `/exec`

#### Error: "Upstream status: 302" or "Upstream status: 405"
**Solution**: Your Google Apps Script deployment settings are incorrect:
- Go to Google Apps Script
- Click Deploy → Manage deployments
- Edit deployment
- Set "Who has access" to "Anyone"
- Set "Execute as" to "Me"

## File Structure

```
supabase/
├── functions/
│   └── google_sheets_sync/     ← Only this one exists now
│       └── index.ts
└── config.toml                  ← Updated configuration

src/
├── hooks/
│   └── useGoogleSheetsSync.tsx  ← Improved error handling
└── components/
    └── dashboard/
        └── GoogleSheetsSettings.tsx
```

## Environment Variables

Make sure these are set in your `.env`:

```env
VITE_SUPABASE_PROJECT_ID="ojxzssooylmydystjvdo"
VITE_SUPABASE_URL="https://ojxzssooylmydystjvdo.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

## Next Steps

1. **Deploy the Edge Function** (see Option 1 above)
2. **Test the integration** in your app
3. **Monitor the console** for any errors
4. **Check debug details** in the UI if sync fails

## Support

If you continue to have issues:
1. Check the browser console for detailed error logs
2. Click "Copy debug report" in the Google Sheets settings
3. Review the `upstream_response_text` for Google Apps Script errors
