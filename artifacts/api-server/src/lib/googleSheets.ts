import { google } from "googleapis";

export const SPREADSHEET_ID = "1i668-EeCl3J1eDHCApSXO7r7-YHen7ACc4YevsJWqVY";

// Google Sheets integration via Replit connector: conn_google-sheet_01KN6ER1DS2MHG9P9XDPHX0470
// Falls back to GOOGLE_API_KEY env var if connector OAuth is unavailable
let connectionSettings: any;

async function getAccessTokenFromConnector(): Promise<string | null> {
  try {
    if (
      connectionSettings &&
      connectionSettings.settings?.expires_at &&
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
    ) {
      return connectionSettings.settings.access_token;
    }

    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
        ? "depl " + process.env.WEB_REPL_RENEWAL
        : null;

    if (!xReplitToken || !hostname) return null;

    const response = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=google-sheet`,
      {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const item = data.items?.[0];
    if (!item) return null;

    connectionSettings = item;
    const accessToken =
      item?.settings?.access_token ||
      item?.settings?.oauth?.credentials?.access_token;

    return accessToken || null;
  } catch {
    return null;
  }
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleSheetClient() {
  // Try connector OAuth first
  const accessToken = await getAccessTokenFromConnector();

  if (accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.sheets({ version: "v4", auth: oauth2Client });
  }

  // Fall back to API key
  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return google.sheets({ version: "v4", auth: apiKey });
  }

  throw new Error(
    "Google Sheets not authenticated. Set GOOGLE_API_KEY environment variable.",
  );
}

export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}
