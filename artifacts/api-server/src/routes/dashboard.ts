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

router.get("/dashboard/overview", async (req, res): Promise<void> => {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetTitles = spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "").filter(Boolean) ?? [];

    let totalBudget = 0, totalSpend = 0, totalRevenue = 0;
    let totalImpressions = 0, totalClicks = 0, totalConversions = 0, activeCampaigns = 0;

    for (const title of sheetTitles) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${title}!A1:Z1000`,
        });
        const rows = response.data.values ?? [];
        if (rows.length < 2) continue;
        const headers = rows[0].map((h: string) => h?.toString().toLowerCase().trim());

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const get = (names: string[]) => {
            for (const name of names) {
              const idx = headers.findIndex((h: string) => h === name || h.includes(name));
              if (idx !== -1) return row[idx] ?? "";
            }
            return "";
          };
          const budget = parseNumber(get(["budget", "total budget"]));
          const spend = parseNumber(get(["spend", "cost", "actual spend", "amount spent"]));
          const revenue = parseNumber(get(["revenue", "sales", "income", "total revenue"]));
          const impressions = parseNumber(get(["impressions", "impression", "views"]));
          const clicks = parseNumber(get(["clicks", "click"]));
          const conversions = parseNumber(get(["conversions", "conversion", "leads"]));
          if (budget > 0 || spend > 0 || revenue > 0) {
            totalBudget += budget; totalSpend += spend; totalRevenue += revenue;
            totalImpressions += impressions; totalClicks += clicks;
            totalConversions += conversions; activeCampaigns++;
          }
        }
      } catch { req.log.warn({ sheet: title }, "Could not read sheet"); }
    }

    res.json(GetDashboardOverviewResponse.parse({
      totalBudget, totalSpend, totalRevenue, totalImpressions, totalClicks, totalConversions,
      overallROI: totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0,
      overallCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      overallCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
      overallCPA: totalConversions > 0 ? totalSpend / totalConversions : 0,
      activeCampaigns, lastUpdated: new Date().toISOString(),
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch dashboard overview");
    res.status(500).json({ error: "Failed to fetch dashboard overview" });
  }
});

router.get("/dashboard/sheets", async (req, res): Promise<void> => {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames = spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "").filter(Boolean) ?? [];
    res.json(GetSheetsListResponse.parse({ sheets: sheetNames }));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch sheets list");
    res.status(500).json({ error: "Failed to fetch sheets list" });
  }
});

router.get("/dashboard/sheet/:sheetName", async (req, res): Promise<void> => {
  const params = GetSheetDataParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const sheets = await getUncachableGoogleSheetClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${params.data.sheetName}!A1:Z1000`,
    });
    const rows = response.data.values ?? [];
    if (rows.length === 0) {
      res.json(GetSheetDataResponse.parse({ sheetName: params.data.sheetName, headers: [], rows: [], totalRows: 0 }));
      return;
    }
    const headers = rows[0].map((h: any) => h?.toString() ?? "");
    const dataRows = rows.slice(1).map((row: any[]) => headers.map((_: any, i: number) => (row[i] ?? "").toString()));
    res.json(GetSheetDataResponse.parse({ sheetName: params.data.sheetName, headers, rows: dataRows, totalRows: dataRows.length }));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch sheet data");
    res.status(500).json({ error: "Failed to fetch sheet data" });
  }
});

router.get("/dashboard/campaigns", async (req, res): Promise<void> => {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetTitles = spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "").filter(Boolean) ?? [];
    const campaigns: any[] = [];

    for (const title of sheetTitles) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${title}!A1:Z1000`,
        });
        const rows = response.data.values ?? [];
        if (rows.length < 2) continue;
        const headers = rows[0].map((h: string) => h?.toString().toLowerCase().trim());
        const hasName = headers.some((h: string) => h.includes("campaign") || h === "name" || h.includes("channel") || h.includes("product") || h.includes("platform"));
        if (!hasName) continue;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const get = (names: string[]) => {
            for (const name of names) {
              const idx = headers.findIndex((h: string) => h === name || h.includes(name));
              if (idx !== -1) return row[idx]?.toString() ?? "";
            }
            return "";
          };
          const name = get(["campaign name", "campaign", "product name", "product", "name"]) || `${title} Row ${i}`;
          const channel = get(["channel", "platform", "source", "ad type"]) || title;
          const status = get(["status", "state"]) || "Active";
          const budget = parseNumber(get(["budget"]));
          const spend = parseNumber(get(["spend", "cost", "amount spent", "ad spend", "total spend"]));
          const impressions = parseNumber(get(["impressions", "impression", "reach"]));
          const clicks = parseNumber(get(["clicks", "click", "link clicks"]));
          const conversions = parseNumber(get(["conversions", "conversion", "orders", "sales qty", "quantity"]));
          const revenue = parseNumber(get(["revenue", "sales", "gmv", "total sales", "sales amount"]));
          const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
          const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
          const cpc = clicks > 0 ? spend / clicks : 0;
          const cpa = conversions > 0 ? spend / conversions : 0;
          if (budget > 0 || spend > 0 || revenue > 0 || impressions > 0) {
            campaigns.push({ name, channel, status, budget, spend, impressions, clicks, conversions, revenue, roi, ctr, cpc, cpa });
          }
        }
      } catch { req.log.warn({ sheet: title }, "Could not parse campaigns from sheet"); }
    }

    res.json(GetCampaignsResponse.parse({ campaigns, total: campaigns.length }));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch campaigns");
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.get("/dashboard/channels", async (req, res): Promise<void> => {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetTitles = spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "").filter(Boolean) ?? [];
    const channelMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

    for (const title of sheetTitles) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${title}!A1:Z1000`,
        });
        const rows = response.data.values ?? [];
        if (rows.length < 2) continue;
        const headers = rows[0].map((h: string) => h?.toString().toLowerCase().trim());

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const get = (names: string[]) => {
            for (const name of names) {
              const idx = headers.findIndex((h: string) => h === name || h.includes(name));
              if (idx !== -1) return row[idx]?.toString() ?? "";
            }
            return "";
          };
          const channel = get(["channel", "platform", "source", "ad type"]) || title;
          const spend = parseNumber(get(["spend", "cost", "amount spent", "ad spend", "total spend"]));
          const revenue = parseNumber(get(["revenue", "sales", "gmv", "total sales", "sales amount"]));
          const impressions = parseNumber(get(["impressions", "impression", "reach"]));
          const clicks = parseNumber(get(["clicks", "click", "link clicks"]));
          const conversions = parseNumber(get(["conversions", "conversion", "orders", "sales qty"]));
          if (spend > 0 || revenue > 0 || impressions > 0) {
            if (!channelMap[channel]) channelMap[channel] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
            channelMap[channel].spend += spend; channelMap[channel].revenue += revenue;
            channelMap[channel].impressions += impressions; channelMap[channel].clicks += clicks;
            channelMap[channel].conversions += conversions;
          }
        }
      } catch { req.log.warn({ sheet: title }, "Could not parse channels from sheet"); }
    }

    const channels = Object.entries(channelMap).map(([channel, data]) => ({
      channel, spend: data.spend, revenue: data.revenue, impressions: data.impressions,
      clicks: data.clicks, conversions: data.conversions,
      roi: data.spend > 0 ? ((data.revenue - data.spend) / data.spend) * 100 : 0,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
    }));

    res.json(GetChannelsResponse.parse({ channels }));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch channels");
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

router.get("/dashboard/monthly-trend", async (req, res): Promise<void> => {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetTitles = spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "").filter(Boolean) ?? [];
    const monthMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

    for (const title of sheetTitles) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${title}!A1:Z1000`,
        });
        const rows = response.data.values ?? [];
        if (rows.length < 2) continue;
        const headers = rows[0].map((h: string) => h?.toString().toLowerCase().trim());

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const get = (names: string[]) => {
            for (const name of names) {
              const idx = headers.findIndex((h: string) => h === name || h.includes(name));
              if (idx !== -1) return row[idx]?.toString() ?? "";
            }
            return "";
          };
          const monthRaw = get(["month", "date", "period", "week", "day"]);
          const spend = parseNumber(get(["spend", "cost", "amount spent", "ad spend", "total spend"]));
          const revenue = parseNumber(get(["revenue", "sales", "gmv", "total sales", "sales amount"]));
          const impressions = parseNumber(get(["impressions", "impression", "reach"]));
          const clicks = parseNumber(get(["clicks", "click", "link clicks"]));
          const conversions = parseNumber(get(["conversions", "conversion", "orders", "sales qty"]));
          if (!monthRaw || (spend === 0 && revenue === 0 && impressions === 0)) continue;

          // Normalize month: try to parse as date, fall back to first 7 chars
          let month = monthRaw.substring(0, 7);
          const dateParsed = new Date(monthRaw);
          if (!isNaN(dateParsed.getTime())) {
            month = dateParsed.toISOString().substring(0, 7);
          }

          if (!monthMap[month]) monthMap[month] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
          monthMap[month].spend += spend; monthMap[month].revenue += revenue;
          monthMap[month].impressions += impressions; monthMap[month].clicks += clicks;
          monthMap[month].conversions += conversions;
        }
      } catch { req.log.warn({ sheet: title }, "Could not parse monthly from sheet"); }
    }

    const trend = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month, spend: data.spend, revenue: data.revenue, impressions: data.impressions,
        clicks: data.clicks, conversions: data.conversions,
        roi: data.spend > 0 ? ((data.revenue - data.spend) / data.spend) * 100 : 0,
      }));

    res.json(GetMonthlyTrendResponse.parse({ trend }));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch monthly trend");
    res.status(500).json({ error: "Failed to fetch monthly trend" });
  }
});

export default router;
