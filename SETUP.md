# Marketing Dashboard Setup Guide

## Google Sheets API Configuration

The dashboard reads data from this Google Spreadsheet:
https://docs.google.com/spreadsheets/d/1i668-EeCl3J1eDHCApSXO7r7-YHen7ACc4YevsJWqVY/edit

### Steps to Configure Google Sheets API:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select an existing one)
   - Click "Select a project" → "New Project"
   - Name it (e.g., "Marketing Dashboard")
   - Click "Create"

3. **Enable Google Sheets API**
   - Go to: https://console.cloud.google.com/apis/library
   - Search for "Google Sheets API"
   - Click on it and press "Enable"

4. **Create API Credentials**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Make the Spreadsheet Public** (Important!)
   - Open your spreadsheet: https://docs.google.com/spreadsheets/d/1i668-EeCl3J1eDHCApSXO7r7-YHen7ACc4YevsJWqVY/edit
   - Click "Share" button (top right)
   - Click "Change to anyone with the link"
   - Set permission to "Viewer"
   - Click "Done"

6. **Create Environment File**
   ```bash
   cd artifacts/api-server
   cp .env.example .env
   ```

7. **Add Your API Key**
   Edit `.env` file and replace `your_google_api_key_here` with your actual API key:
   ```
   GOOGLE_API_KEY=AIzaSyC...your_actual_key
   PORT=3001
   ```

8. **Restart the API Server**
   - Stop the current server (Ctrl+C)
   - Run: `PORT=3001 GOOGLE_API_KEY=your_key pnpm --filter @workspace/api-server dev`

## Running the Application

### Start API Server:
```bash
PORT=3001 GOOGLE_API_KEY=your_api_key pnpm --filter @workspace/api-server dev
```

### Start Frontend Dashboard:
```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/chairman-dashboard dev
```

### Access the Dashboard:
- Frontend: http://localhost:5173
- API: http://localhost:3001

## Troubleshooting

### No data showing?
1. Verify the spreadsheet is public (anyone with link can view)
2. Check that GOOGLE_API_KEY is set correctly
3. Check API server logs for errors
4. Verify the spreadsheet ID matches in `artifacts/api-server/src/lib/googleSheets.ts`

### API Key Issues?
- Make sure Google Sheets API is enabled in your Google Cloud project
- Verify the API key has no restrictions that would block Sheets API access
- Try creating a new API key if the current one doesn't work
