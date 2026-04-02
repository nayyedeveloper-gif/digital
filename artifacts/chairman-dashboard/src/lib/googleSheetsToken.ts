const CONNECTOR_ENDPOINT =
  "https://connectors.replit.com/api/v2/connection?include_secrets=true&connector_names=google-sheet";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const res = await fetch(CONNECTOR_ENDPOINT, {
      headers: { Accept: "application/json" },
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const token =
      item?.settings?.access_token ||
      item?.settings?.oauth?.credentials?.access_token;

    if (token) {
      cachedToken = token;
      const expiresAt = item?.settings?.expires_at;
      tokenExpiry = expiresAt
        ? new Date(expiresAt).getTime() - 60000
        : Date.now() + 50 * 60 * 1000;
    }

    return token ?? null;
  } catch (e) {
    console.error("Failed to get Google access token", e);
    return null;
  }
}

export function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}
