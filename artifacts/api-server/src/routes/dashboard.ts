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
  getGoogleSheetsClient,
  SPREADSHEET_ID,
  parseNumber,
} from "../lib/googleSheets";

const router: IRouter = Router();

function getTokenFromRequest(req: any): string | null {
  const authHeader = req.headers["x-google-access-token"];
  if (authHeader && typeof authHeader === "string") return authHeader;
  return null;
}

async function withSheets(req: any, res: any, fn: (sheets: any) => Promise<void>) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Missing Google access token. Please connect Google Sheets." });
    return;
  }
  const sheets = getGoogleSheetsClient(token);
  await fn(sheets);
}

router.get("/dashboard/overview", async (req, res): Promise<void> => {
  await withSheets(req, res, async (sheets) => {
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetTitles =
        spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "") ?? [];

      let totalBudget = 0;
      let totalSpend = 0;
      let totalRevenue = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      let activeCampaigns = 0;

      for (const title of sheetTitles) {
        if (!title) continue;
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${title}!A1:Z1000`,
          });

          const rows = response.data.values ?? [];
          if (rows.length < 2) continue;

          const headers = rows[0].map((h: string) =>
            h?.toString().toLowerCase().trim(),
          );

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const getValue = (names: string[]) => {
              for (const name of names) {
                const idx = headers.findIndex(
                  (h: string) => h === name || h.includes(name),
                );
                if (idx !== -1) return row[idx] ?? "";
              }
              return "";
            };

            const budget = parseNumber(getValue(["budget", "total budget"]));
            const spend = parseNumber(getValue(["spend", "cost", "actual spend", "amount spent"]));
            const revenue = parseNumber(getValue(["revenue", "sales", "income", "total revenue"]));
            const impressions = parseNumber(getValue(["impressions", "impression", "views"]));
            const clicks = parseNumber(getValue(["clicks", "click"]));
            const conversions = parseNumber(getValue(["conversions", "conversion", "leads"]));

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
        } catch {
          req.log.warn({ sheet: title }, "Could not read sheet");
        }
      }

      const overallROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
      const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const overallCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const overallCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

      res.json(GetDashboardOverviewResponse.parse({
        totalBudget,
        totalSpend,
        totalRevenue,
        totalImpressions,
        totalClicks,
        totalConversions,
        overallROI,
        overallCTR,
        overallCPC,
        overallCPA,
        activeCampaigns,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (err) {
      req.log.error({ err }, "Failed to fetch dashboard overview");
      res.status(500).json({ error: "Failed to fetch dashboard overview" });
    }
  });
});

router.get("/dashboard/sheets", async (req, res): Promise<void> => {
  await withSheets(req, res, async (sheets) => {
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetNames =
        spreadsheet.data.sheets
          ?.map((s: any) => s.properties?.title ?? "")
          .filter(Boolean) ?? [];

      res.json(GetSheetsListResponse.parse({ sheets: sheetNames }));
    } catch (err) {
      req.log.error({ err }, "Failed to fetch sheets list");
      res.status(500).json({ error: "Failed to fetch sheets list" });
    }
  });
});

router.get("/dashboard/sheet/:sheetName", async (req, res): Promise<void> => {
  const params = GetSheetDataParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await withSheets(req, res, async (sheets) => {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${params.data.sheetName}!A1:Z1000`,
      });

      const rows = response.data.values ?? [];
      if (rows.length === 0) {
        res.json(GetSheetDataResponse.parse({
          sheetName: params.data.sheetName,
          headers: [],
          rows: [],
          totalRows: 0,
        }));
        return;
      }

      const headers = rows[0].map((h: any) => h?.toString() ?? "");
      const dataRows = rows.slice(1).map((row: any[]) =>
        headers.map((_: any, i: number) => (row[i] ?? "").toString()),
      );

      res.json(GetSheetDataResponse.parse({
        sheetName: params.data.sheetName,
        headers,
        rows: dataRows,
        totalRows: dataRows.length,
      }));
    } catch (err) {
      req.log.error({ err }, "Failed to fetch sheet data");
      res.status(500).json({ error: "Failed to fetch sheet data" });
    }
  });
});

router.get("/dashboard/campaigns", async (req, res): Promise<void> => {
  await withSheets(req, res, async (sheets) => {
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetTitles =
        spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "") ?? [];

      const campaigns: any[] = [];

      for (const title of sheetTitles) {
        if (!title) continue;
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${title}!A1:Z1000`,
          });

          const rows = response.data.values ?? [];
          if (rows.length < 2) continue;

          const headers = rows[0].map((h: string) =>
            h?.toString().toLowerCase().trim(),
          );

          const hasName =
            headers.some((h: string) => h.includes("campaign") || h === "name") ||
            headers.some((h: string) => h.includes("channel"));
          if (!hasName) continue;

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const get = (names: string[]) => {
              for (const name of names) {
                const idx = headers.findIndex(
                  (h: string) => h === name || h.includes(name),
                );
                if (idx !== -1) return row[idx]?.toString() ?? "";
              }
              return "";
            };

            const name = get(["campaign name", "campaign", "name"]) || `Row ${i}`;
            const channel = get(["channel", "platform", "source"]) || title;
            const status = get(["status", "state"]) || "Active";
            const budget = parseNumber(get(["budget"]));
            const spend = parseNumber(get(["spend", "cost", "amount spent"]));
            const impressions = parseNumber(get(["impressions", "impression"]));
            const clicks = parseNumber(get(["clicks", "click"]));
            const conversions = parseNumber(get(["conversions", "conversion"]));
            const revenue = parseNumber(get(["revenue", "sales"]));
            const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? spend / clicks : 0;
            const cpa = conversions > 0 ? spend / conversions : 0;

            if (budget > 0 || spend > 0 || revenue > 0 || impressions > 0) {
              campaigns.push({ name, channel, status, budget, spend, impressions, clicks, conversions, revenue, roi, ctr, cpc, cpa });
            }
          }
        } catch {
          req.log.warn({ sheet: title }, "Could not parse campaigns from sheet");
        }
      }

      res.json(GetCampaignsResponse.parse({ campaigns, total: campaigns.length }));
    } catch (err) {
      req.log.error({ err }, "Failed to fetch campaigns");
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });
});

router.get("/dashboard/channels", async (req, res): Promise<void> => {
  await withSheets(req, res, async (sheets) => {
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetTitles =
        spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "") ?? [];

      const channelMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

      for (const title of sheetTitles) {
        if (!title) continue;
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

            const channel = get(["channel", "platform", "source"]) || title;
            const spend = parseNumber(get(["spend", "cost", "amount spent"]));
            const revenue = parseNumber(get(["revenue", "sales"]));
            const impressions = parseNumber(get(["impressions", "impression"]));
            const clicks = parseNumber(get(["clicks", "click"]));
            const conversions = parseNumber(get(["conversions", "conversion"]));

            if (spend > 0 || revenue > 0 || impressions > 0) {
              if (!channelMap[channel]) {
                channelMap[channel] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
              }
              channelMap[channel].spend += spend;
              channelMap[channel].revenue += revenue;
              channelMap[channel].impressions += impressions;
              channelMap[channel].clicks += clicks;
              channelMap[channel].conversions += conversions;
            }
          }
        } catch {
          req.log.warn({ sheet: title }, "Could not parse channels from sheet");
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

      res.json(GetChannelsResponse.parse({ channels }));
    } catch (err) {
      req.log.error({ err }, "Failed to fetch channels");
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });
});

router.get("/dashboard/monthly-trend", async (req, res): Promise<void> => {
  await withSheets(req, res, async (sheets) => {
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });

      const sheetTitles =
        spreadsheet.data.sheets?.map((s: any) => s.properties?.title ?? "") ?? [];

      const monthMap: Record<string, { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }> = {};

      for (const title of sheetTitles) {
        if (!title) continue;
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

            const monthRaw = get(["month", "date", "period", "week"]);
            const spend = parseNumber(get(["spend", "cost", "amount spent"]));
            const revenue = parseNumber(get(["revenue", "sales"]));
            const impressions = parseNumber(get(["impressions", "impression"]));
            const clicks = parseNumber(get(["clicks", "click"]));
            const conversions = parseNumber(get(["conversions", "conversion"]));

            if (!monthRaw || (spend === 0 && revenue === 0 && impressions === 0)) continue;

            const month = monthRaw.substring(0, 7);
            if (!monthMap[month]) {
              monthMap[month] = { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 };
            }
            monthMap[month].spend += spend;
            monthMap[month].revenue += revenue;
            monthMap[month].impressions += impressions;
            monthMap[month].clicks += clicks;
            monthMap[month].conversions += conversions;
          }
        } catch {
          req.log.warn({ sheet: title }, "Could not parse monthly from sheet");
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

      res.json(GetMonthlyTrendResponse.parse({ trend }));
    } catch (err) {
      req.log.error({ err }, "Failed to fetch monthly trend");
      res.status(500).json({ error: "Failed to fetch monthly trend" });
    }
  });
});

export default router;
