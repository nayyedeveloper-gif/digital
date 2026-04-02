import { google } from "googleapis";

export const SPREADSHEET_ID = "1i668-EeCl3J1eDHCApSXO7r7-YHen7ACc4YevsJWqVY";

export function getGoogleSheetsClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth: oauth2Client });
}

export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}

export async function fetchAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) throw new Error("REPLIT_CONNECTORS_HOSTNAME not set");

  const replIdentity = process.env.REPL_IDENTITY;
  const webRenewal = process.env.WEB_REPL_RENEWAL;

  if (!replIdentity && !webRenewal) {
    throw new Error("No Replit identity available");
  }

  const xReplitToken = replIdentity
    ? "repl " + replIdentity
    : "depl " + webRenewal;

  const response = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=google-sheet",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    },
  );

  const data = await response.json();
  const item = data.items?.[0];

  if (!item) {
    throw new Error("Google Sheet connection not found");
  }

  const accessToken =
    item?.settings?.access_token ||
    item?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error("No access token in connection settings");
  }

  return accessToken;
}
