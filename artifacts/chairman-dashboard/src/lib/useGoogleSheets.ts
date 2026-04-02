import { useQuery } from "@tanstack/react-query";
import { getGoogleAccessToken } from "./googleSheetsToken";

const SPREADSHEET_ID = "1i668-EeCl3J1eDHCApSXO7r7-YHen7ACc4YevsJWqVY";
const BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsGet(token: string, path: string) {
  const res = await fetch(`${BASE_URL}/${SPREADSHEET_ID}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  return res.json();
}

function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}

function getByNames(row: string[], headers: string[], names: string[]): string {
  for (const name of names) {
    const idx = headers.findIndex(
      (h) => h === name || h.includes(name),
    );
    if (idx !== -1) return row[idx] ?? "";
  }
  return "";
}

async function fetchAllSheetData(token: string) {
  const spreadsheet = await sheetsGet(token, "");
  const sheetTitles: string[] =
    spreadsheet.sheets?.map((s: any) => s.properties?.title ?? "").filter(Boolean) ?? [];

  const results: { title: string; headers: string[]; rows: string[][] }[] = [];

  for (const title of sheetTitles) {
    try {
      const resp = await sheetsGet(token, `/values/${encodeURIComponent(title)}!A1:Z1000`);
      const rawRows: string[][] = resp.values ?? [];
      if (rawRows.length < 1) continue;
      const headers = rawRows[0].map((h: string) => h?.toString().toLowerCase().trim());
      const rows = rawRows.slice(1).map((r: any[]) => headers.map((_: any, i: number) => (r[i] ?? "").toString()));
      results.push({ title, headers, rows });
    } catch {
      // skip bad sheets
    }
  }
  return { sheetTitles, results };
}

export function useSheetsList() {
  return useQuery({
    queryKey: ["sheets-list"],
    queryFn: async () => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error("Not authenticated with Google Sheets");
      const spreadsheet = await sheetsGet(token, "");
      const sheets: string[] =
        spreadsheet.sheets?.map((s: any) => s.properties?.title ?? "").filter(Boolean) ?? [];
      return { sheets };
    },
  });
}

export function useSheetData(sheetName: string | null) {
  return useQuery({
    queryKey: ["sheet-data", sheetName],
    enabled: !!sheetName,
    queryFn: async () => {
      if (!sheetName) throw new Error("No sheet selected");
      const token = await getGoogleAccessToken();
      if (!token) throw new Error("Not authenticated");
      const resp = await sheetsGet(token, `/values/${encodeURIComponent(sheetName)}!A1:Z1000`);
      const rawRows: string[][] = resp.values ?? [];
      if (rawRows.length === 0) return { sheetName, headers: [], rows: [], totalRows: 0 };
      const headers = rawRows[0].map((h: any) => h?.toString() ?? "");
      const rows = rawRows.slice(1).map((r: any[]) => headers.map((_: any, i: number) => (r[i] ?? "").toString()));
      return { sheetName, headers, rows, totalRows: rows.length };
    },
  });
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error("Not authenticated");
      const { results } = await fetchAllSheetData(token);

      let totalBudget = 0, totalSpend = 0, totalRevenue = 0;
      let totalImpressions = 0, totalClicks = 0, totalConversions = 0;
      let activeCampaigns = 0;

      for (const { headers, rows } of results) {
        for (const row of rows) {
          const g = (names: string[]) => getByNames(row, headers, names);
          const budget = parseNumber(g(["budget", "total budget"]));
          const spend = parseNumber(g(["spend", "cost", "amount spent"]));
          const revenue = parseNumber(g(["revenue", "sales", "income"]));
          const impressions = parseNumber(g(["impressions", "impression", "views"]));
          const clicks = parseNumber(g(["clicks", "click"]));
          const conversions = parseNumber(g(["conversions", "conversion", "leads"]));

          if (budget > 0 || spend > 0 || revenue > 0) {
            totalBudget += budget;
            totalSpend += spend;
            totalRevenue += revenue;
            totalImpressions += impressions;
            totalClicks += clicks;
            totalConversions += conversions;
            activeCampaigns++;
          }
        }
      }

      return {
        totalBudget,
        totalSpend,
        totalRevenue,
        totalImpressions,
        totalClicks,
        totalConversions,
        overallROI: totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0,
        overallCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        overallCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
        overallCPA: totalConversions > 0 ? totalSpend / totalConversions : 0,
        activeCampaigns,
        lastUpdated: new Date().toISOString(),
      };
    },
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error("Not authenticated");
      const { results } = await fetchAllSheetData(token);

      const campaigns: any[] = [];

      for (const { title, headers, rows } of results) {
        const hasName = headers.some((h) => h.includes("campaign") || h === "name" || h.includes("channel"));
        if (!hasName) continue;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const g = (names: string[]) => getByNames(row, headers, names);
          const name = g(["campaign name", "campaign", "name"]) || `Row ${i + 1}`;
          const channel = g(["channel", "platform", "source"]) || title;
          const status = g(["status", "state"]) || "Active";
          const budget = parseNumber(g(["budget"]));
          const spend = parseNumber(g(["spend", "cost", "amount spent"]));
          const impressions = parseNumber(g(["impressions", "impression"]));
          const clicks = parseNumber(g(["clicks", "click"]));
          const conversions = parseNumber(g(["conversions", "conversion"]));
          const revenue = parseNumber(g(["revenue", "sales"]));
          const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
          const cpc = clicks > 0 ? spend / clicks : 0;
          const cpa = conversions > 0 ? spend / conversions : 0;

          if (budget > 0 || spend > 0 || revenue > 0 || impressions > 0) {
            campaigns.push({ name, channel, status, budget, spend, impressions, clicks, conversions, revenue, roi, ctr, cpc, cpa });
          }
        }
      }

      return { campaigns, total: campaigns.length };
    },
  });
}

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error("Not authenticated");
      const { results } = await fetchAllSheetData(token);

      const channelMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

      for (const { title, headers, rows } of results) {
        for (const row of rows) {
          const g = (names: string[]) => getByNames(row, headers, names);
          const channel = g(["channel", "platform", "source"]) || title;
          const spend = parseNumber(g(["spend", "cost", "amount spent"]));
          const revenue = parseNumber(g(["revenue", "sales"]));
          const impressions = parseNumber(g(["impressions", "impression"]));
          const clicks = parseNumber(g(["clicks", "click"]));
          const conversions = parseNumber(g(["conversions", "conversion"]));

          if (spend > 0 || revenue > 0 || impressions > 0) {
            if (!channelMap[channel]) channelMap[channel] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
            channelMap[channel].spend += spend;
            channelMap[channel].revenue += revenue;
            channelMap[channel].impressions += impressions;
            channelMap[channel].clicks += clicks;
            channelMap[channel].conversions += conversions;
          }
        }
      }

      const channels = Object.entries(channelMap).map(([channel, data]) => ({
        channel,
        spend: data.spend,
        revenue: data.revenue,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        roi: data.spend > 0 ? ((data.revenue - data.spend) / data.spend) * 100 : 0,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      }));

      return { channels };
    },
  });
}

export function useMonthlyTrend() {
  return useQuery({
    queryKey: ["monthly-trend"],
    queryFn: async () => {
      const token = await getGoogleAccessToken();
      if (!token) throw new Error("Not authenticated");
      const { results } = await fetchAllSheetData(token);

      const monthMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

      for (const { headers, rows } of results) {
        for (const row of rows) {
          const g = (names: string[]) => getByNames(row, headers, names);
          const monthRaw = g(["month", "date", "period", "week"]);
          const spend = parseNumber(g(["spend", "cost", "amount spent"]));
          const revenue = parseNumber(g(["revenue", "sales"]));
          const impressions = parseNumber(g(["impressions", "impression"]));
          const clicks = parseNumber(g(["clicks", "click"]));
          const conversions = parseNumber(g(["conversions", "conversion"]));

          if (!monthRaw || (spend === 0 && revenue === 0 && impressions === 0)) continue;

          const month = monthRaw.substring(0, 7);
          if (!monthMap[month]) monthMap[month] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
          monthMap[month].spend += spend;
          monthMap[month].revenue += revenue;
          monthMap[month].impressions += impressions;
          monthMap[month].clicks += clicks;
          monthMap[month].conversions += conversions;
        }
      }

      const trend = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          spend: data.spend,
          revenue: data.revenue,
          impressions: data.impressions,
          clicks: data.clicks,
          conversions: data.conversions,
          roi: data.spend > 0 ? ((data.revenue - data.spend) / data.spend) * 100 : 0,
        }));

      return { trend };
    },
  });
}
