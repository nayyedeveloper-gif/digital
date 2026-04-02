import { Router, type IRouter } from "express";
import {
  GetDashboardOverviewResponse,
  GetSheetsListResponse,
  GetSheetDataParams,
  GetSheetDataResponse,
  GetCampaignsResponse,
  GetChannelsResponse,
  GetMonthlyTrendResponse,
} from "@workspace/api-zod";
import {
  getUncachableGoogleSheetClient,
  SPREADSHEET_ID,
  parseNumber,
} from "../lib/googleSheets";

const router: IRouter = Router();

// --- In-memory cache to avoid hitting Google Sheets rate limits ---
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
interface CacheEntry<T> { value: T; expiresAt: number; }
const cache: Record<string, CacheEntry<any>> = {};

function fromCache<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  return null;
}
function toCache<T>(key: string, value: T): void {
  cache[key] = { value, expiresAt: Date.now() + CACHE_TTL_MS };
}

// --- Column value helpers ---
function getVal(row: string[], headers: string[], names: string[]): string {
  for (const name of names) {
    const lower = name.toLowerCase();
    const idx = headers.findIndex(
      (h) => h.toLowerCase() === lower || h.toLowerCase().includes(lower),
    );
    if (idx !== -1) return row[idx] ?? "";
  }
  return "";
}

// --- Fetch and cache all sheets data ---
async function fetchAllSheetsData() {
  const cached = fromCache<{ sheetTitles: string[]; results: { title: string; headers: string[]; rows: string[][] }[] }>("allSheets");
  if (cached) return cached;

  const sheets = await getUncachableGoogleSheetClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetTitles = spreadsheet.data.sheets
    ?.map((s: any) => s.properties?.title ?? "")
    .filter(Boolean) ?? [];

  const results: { title: string; headers: string[]; rows: string[][] }[] = [];
  for (const title of sheetTitles) {
    try {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${title}!A1:Z1000`,
      });
      const raw = resp.data.values ?? [];
      if (raw.length < 2) continue;
      const headers = raw[0].map((h: any) => h?.toString() ?? "");
      const rows = raw.slice(1).map((r: any[]) =>
        headers.map((_: any, i: number) => (r[i] ?? "").toString()),
      );
      results.push({ title, headers, rows });
    } catch { /* skip bad sheets */ }
  }

  const data = { sheetTitles, results };
  toCache("allSheets", data);
  return data;
}

// --- Per-sheet row extraction (matches this specific spreadsheet's column names) ---
function extractRow(title: string, headers: string[], row: string[]) {
  const g = (names: string[]) => getVal(row, headers, names);
  const t = title.toLowerCase();

  if (t.includes("live sales")) {
    const dateRaw = g(["ရက်စွဲ", "date"]);
    const channel = g(["social type"]) || "Live Sale";
    const revenue = parseNumber(g(["ရောင်းရသော ငွေပမာဏ"]));
    const qty = parseNumber(g(["ရောင်းရသော ပစ္စည်း အရေအတွက်"]));
    const views = parseNumber(g(["view", "views"]));
    const spend = parseNumber(g(["ads spend amount"]));
    const campaign = g(["creator အမည်", "creator"]) || "Live Sale";
    return { date: dateRaw, channel, revenue, spend, impressions: views, clicks: 0, conversions: qty, campaign };
  }

  if (t === "report") {
    const dateRaw = g(["day", "date"]);
    const pageName = g(["page name"]);
    const channel = pageName.toLowerCase().includes("channel 2") ? "Facebook (Ch2)" : "Facebook (Ch1)";
    const campaign = g(["campaign name"]) || "Paid Ad";
    const spend = parseNumber(g(["amount spent (usd)", "amount spent"]));
    const impressions = parseNumber(g(["impressions"]));
    const engagement = parseNumber(g(["page engagement"]));
    return { date: dateRaw, channel, revenue: 0, spend, impressions, clicks: engagement, conversions: 0, campaign };
  }

  if (t.includes("organic")) {
    const dateRaw = g(["publish time"]);
    const campaign = g(["title"]) || "Organic Post";
    const views = parseNumber(g(["views"]));
    const clicks = parseNumber(g(["total clicks"]));
    return { date: dateRaw, channel: "Organic", revenue: 0, spend: 0, impressions: views, clicks, conversions: 0, campaign };
  }

  if (t.includes("daily ads")) {
    const dateRaw = g(["ရက်စွဲ", "date"]);
    const channel = g(["social type"]) || "Ads";
    const campaign = g(["channel name", "ads account"]) || "Daily Ad";
    const spend = parseNumber(g(["ads spend amount ($)"]));
    const origViews = parseNumber(g(["original views"]));
    const adViews = parseNumber(g(["ad views"]));
    const views = origViews + adViews;
    const comments = parseNumber(g(["original comments"]));
    return { date: dateRaw, channel, revenue: 0, spend, impressions: views, clicks: comments, conversions: 0, campaign };
  }

  // Daily Report - posting tracker only, no financial/performance data
  return null;
}

// --- Normalize raw date string to YYYY-MM for monthly grouping ---
function toYearMonth(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.replace(/\//g, "-").split(" ")[0];
  const d = new Date(parts);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 7);
  const mmMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmMatch) {
    const [, dd, mm, yyyy] = mmMatch;
    return `${yyyy}-${mm.padStart(2, "0")}`;
  }
  return null;
}

// --- Routes ---

router.get("/dashboard/overview", async (req, res): Promise<void> => {
  try {
    const cached = fromCache<any>("overview");
    if (cached) { res.json(cached); return; }

    const { results } = await fetchAllSheetsData();
    let totalSpend = 0, totalRevenue = 0, totalImpressions = 0;
    let totalClicks = 0, totalConversions = 0, activeCampaigns = 0;

    for (const { title, headers, rows } of results) {
      for (const row of rows) {
        const d = extractRow(title, headers, row);
        if (!d) continue;
        if (d.spend > 0 || d.revenue > 0 || d.impressions > 0) {
          totalSpend += d.spend;
          totalRevenue += d.revenue;
          totalImpressions += d.impressions;
          totalClicks += d.clicks;
          totalConversions += d.conversions;
          activeCampaigns++;
        }
      }
    }

    const result = GetDashboardOverviewResponse.parse({
      totalBudget: 0,
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
    });
    toCache("overview", result);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch dashboard overview");
    res.status(500).json({ error: "Failed to fetch dashboard overview" });
  }
});

router.get("/dashboard/sheets", async (req, res): Promise<void> => {
  try {
    const cached = fromCache<any>("sheets");
    if (cached) { res.json(cached); return; }

    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames = spreadsheet.data.sheets
      ?.map((s: any) => s.properties?.title ?? "")
      .filter(Boolean) ?? [];
    const result = GetSheetsListResponse.parse({ sheets: sheetNames });
    toCache("sheets", result);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch sheets list");
    res.status(500).json({ error: "Failed to fetch sheets list" });
  }
});

router.get("/dashboard/sheet/:sheetName", async (req, res): Promise<void> => {
  const params = GetSheetDataParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const cacheKey = `sheet:${params.data.sheetName}`;
  const cached = fromCache<any>(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    const sheets = await getUncachableGoogleSheetClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${params.data.sheetName}!A1:Z1000`,
    });
    const rows = response.data.values ?? [];
    if (rows.length === 0) {
      const result = GetSheetDataResponse.parse({ sheetName: params.data.sheetName, headers: [], rows: [], totalRows: 0 });
      toCache(cacheKey, result);
      res.json(result);
      return;
    }
    const headers = rows[0].map((h: any) => h?.toString() ?? "");
    const dataRows = rows.slice(1).map((row: any[]) =>
      headers.map((_: any, i: number) => (row[i] ?? "").toString()),
    );
    const result = GetSheetDataResponse.parse({ sheetName: params.data.sheetName, headers, rows: dataRows, totalRows: dataRows.length });
    toCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch sheet data");
    res.status(500).json({ error: "Failed to fetch sheet data" });
  }
});

router.get("/dashboard/campaigns", async (req, res): Promise<void> => {
  try {
    const cached = fromCache<any>("campaigns");
    if (cached) { res.json(cached); return; }

    const { results } = await fetchAllSheetsData();
    const campaignMap: Record<string, { channel: string; spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

    for (const { title, headers, rows } of results) {
      for (const row of rows) {
        const d = extractRow(title, headers, row);
        if (!d) continue;
        if (d.spend > 0 || d.revenue > 0 || d.impressions > 0) {
          const key = `${d.campaign}||${d.channel}`;
          if (!campaignMap[key]) campaignMap[key] = { channel: d.channel, spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
          campaignMap[key].spend += d.spend;
          campaignMap[key].revenue += d.revenue;
          campaignMap[key].impressions += d.impressions;
          campaignMap[key].clicks += d.clicks;
          campaignMap[key].conversions += d.conversions;
        }
      }
    }

    const campaigns = Object.entries(campaignMap).map(([key, data]) => {
      const [name] = key.split("||");
      return {
        name,
        channel: data.channel,
        status: "Active",
        budget: 0,
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        revenue: data.revenue,
        roi: data.spend > 0 ? ((data.revenue - data.spend) / data.spend) * 100 : 0,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
        cpa: data.conversions > 0 ? data.spend / data.conversions : 0,
      };
    });

    const result = GetCampaignsResponse.parse({ campaigns, total: campaigns.length });
    toCache("campaigns", result);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch campaigns");
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.get("/dashboard/channels", async (req, res): Promise<void> => {
  try {
    const cached = fromCache<any>("channels");
    if (cached) { res.json(cached); return; }

    const { results } = await fetchAllSheetsData();
    const channelMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

    for (const { title, headers, rows } of results) {
      for (const row of rows) {
        const d = extractRow(title, headers, row);
        if (!d) continue;
        if (d.spend > 0 || d.revenue > 0 || d.impressions > 0) {
          if (!channelMap[d.channel]) channelMap[d.channel] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
          channelMap[d.channel].spend += d.spend;
          channelMap[d.channel].revenue += d.revenue;
          channelMap[d.channel].impressions += d.impressions;
          channelMap[d.channel].clicks += d.clicks;
          channelMap[d.channel].conversions += d.conversions;
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

    const result = GetChannelsResponse.parse({ channels });
    toCache("channels", result);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch channels");
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

router.get("/dashboard/monthly-trend", async (req, res): Promise<void> => {
  try {
    const cached = fromCache<any>("monthly-trend");
    if (cached) { res.json(cached); return; }

    const { results } = await fetchAllSheetsData();
    const monthMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

    for (const { title, headers, rows } of results) {
      for (const row of rows) {
        const d = extractRow(title, headers, row);
        if (!d) continue;
        if (d.spend === 0 && d.revenue === 0 && d.impressions === 0) continue;
        const month = toYearMonth(d.date);
        if (!month) continue;
        if (!monthMap[month]) monthMap[month] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
        monthMap[month].spend += d.spend;
        monthMap[month].revenue += d.revenue;
        monthMap[month].impressions += d.impressions;
        monthMap[month].clicks += d.clicks;
        monthMap[month].conversions += d.conversions;
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

    const result = GetMonthlyTrendResponse.parse({ trend });
    toCache("monthly-trend", result);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch monthly trend");
    res.status(500).json({ error: "Failed to fetch monthly trend" });
  }
});

export default router;
