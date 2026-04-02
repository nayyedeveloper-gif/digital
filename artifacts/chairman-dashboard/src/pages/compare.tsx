import { useGetSheetData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Award, Medal } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
const parseNum = (s: string) => parseFloat((s ?? "").replace(/[^0-9.-]/g, "")) || 0;

function headerIdx(headers: string[], names: string[]): number {
  for (const n of names) {
    const i = headers.findIndex(h => h.toLowerCase().includes(n.toLowerCase()));
    if (i !== -1) return i;
  }
  return -1;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // dd/mm/yyyy
  const m1 = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) return new Date(`${m1[3]}-${m1[2].padStart(2,"0")}-${m1[1].padStart(2,"0")}`);
  // yyyy-mm-dd
  const m2 = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return new Date(raw.trim().slice(0,10));
  return null;
}

const PERIOD_OPTIONS = [
  { label: "20 Mar – 26 Mar", start: "2026-03-20", end: "2026-03-26" },
  { label: "27 Mar – 2 Apr",  start: "2026-03-27", end: "2026-04-02" },
  { label: "20 Mar – 24 Mar", start: "2026-03-20", end: "2026-03-24" },
  { label: "25 Mar – 29 Mar", start: "2026-03-25", end: "2026-03-29" },
  { label: "30 Mar – 2 Apr",  start: "2026-03-30", end: "2026-04-02" },
];

interface PeriodMetrics {
  revenue: number; spend: number; views: number;
  items: number; sessions: number; adViews: number;
  comments: number; reactions: number; reach: number;
  impressions: number; engagement: number;
}

function emptyMetrics(): PeriodMetrics {
  return { revenue: 0, spend: 0, views: 0, items: 0, sessions: 0,
           adViews: 0, comments: 0, reactions: 0, reach: 0, impressions: 0, engagement: 0 };
}

function inRange(dateStr: string, start: string, end: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  const ds = d.toISOString().slice(0,10);
  return ds >= start && ds <= end;
}

// ─── delta card ───────────────────────────────────────────────────────────────
function DeltaCard({
  label, a, b, format, loading
}: {
  label: string;
  a: number; b: number;
  format: (v: number) => string;
  loading: boolean;
}) {
  const delta = a > 0 ? ((b - a) / a) * 100 : b > 0 ? 100 : 0;
  const up = delta > 0;
  const neutral = Math.abs(delta) < 0.1;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="pt-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold text-muted-foreground/70">{format(a)}</span>
                  <span className="text-muted-foreground/40 text-lg">→</span>
                  <span className="text-xl font-bold text-foreground">{format(b)}</span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${
                neutral ? "bg-muted text-muted-foreground"
                : up ? "bg-green-500/15 text-green-400"
                : "bg-red-500/15 text-red-400"
              }`}>
                {neutral ? <Minus className="h-3 w-3" /> : up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {neutral ? "—" : `${up ? "+" : ""}${delta.toFixed(1)}%`}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── channel comparison bar ────────────────────────────────────────────────────
function ChannelBar({ label, aVal, bVal, max, colorA, colorB }: {
  label: string; aVal: number; bVal: number; max: number;
  colorA: string; colorB: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex items-center gap-2 h-5">
        <div className="flex-1 bg-muted/30 rounded-full overflow-hidden h-4">
          <div className={`h-full rounded-full ${colorA}`} style={{ width: `${max > 0 ? (aVal / max) * 100 : 0}%`, minWidth: aVal > 0 ? "4px" : "0" }} />
        </div>
      </div>
      <div className="flex items-center gap-2 h-5">
        <div className="flex-1 bg-muted/30 rounded-full overflow-hidden h-4">
          <div className={`h-full rounded-full ${colorB}`} style={{ width: `${max > 0 ? (bVal / max) * 100 : 0}%`, minWidth: bVal > 0 ? "4px" : "0" }} />
        </div>
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────
export default function Compare() {
  const [periodA, setPeriodA] = useState("0");
  const [periodB, setPeriodB] = useState("1");

  const { data: liveSalesData, isLoading: ls } = useGetSheetData("Live Sales Daily Report", { query: { enabled: true } });
  const { data: dailyAdsData, isLoading: da } = useGetSheetData("Daily Ads Report", { query: { enabled: true } });
  const { data: reportData, isLoading: rp } = useGetSheetData("Report", { query: { enabled: true } });

  const isLoading = ls || da || rp;

  const pA = PERIOD_OPTIONS[parseInt(periodA)];
  const pB = PERIOD_OPTIONS[parseInt(periodB)];

  // ── Live Sales processing ─────────────────────────────────────────────────
  const lsHeaders = liveSalesData?.headers ?? [];
  const lsRows = liveSalesData?.rows ?? [];
  const lsDateIdx = headerIdx(lsHeaders, ["ရက်စွဲ"]);
  const lsRevIdx  = headerIdx(lsHeaders, ["ရောင်းရသော ငွေပမာဏ"]);
  const lsQtyIdx  = headerIdx(lsHeaders, ["ရောင်းရသော ပစ္စည်း အရေအတွက်"]);
  const lsViewIdx = headerIdx(lsHeaders, ["view"]);
  const lsChIdx   = headerIdx(lsHeaders, ["social type"]);
  const lsCreIdx  = headerIdx(lsHeaders, ["creator"]);
  const lsSpendIdx= headerIdx(lsHeaders, ["ads spend amount"]);

  // ── Daily Ads processing ──────────────────────────────────────────────────
  const daHeaders = dailyAdsData?.headers ?? [];
  const daRows = dailyAdsData?.rows ?? [];
  const daDateIdx    = headerIdx(daHeaders, ["ရက်စွဲ"]);
  const daChIdx      = headerIdx(daHeaders, ["social type"]);
  const daSpendIdx   = headerIdx(daHeaders, ["ads spend amount ($)"]);
  const daOrigViewIdx= headerIdx(daHeaders, ["original views"]);
  const daAdViewIdx  = headerIdx(daHeaders, ["ad views"]);
  const daOrigCom    = headerIdx(daHeaders, ["original comments"]);
  const daAdCom      = headerIdx(daHeaders, ["ad comments"]);
  const daOrigReact  = headerIdx(daHeaders, ["original reaction"]);
  const daAdReact    = headerIdx(daHeaders, ["ad reaction"]);
  const daChanNameIdx= headerIdx(daHeaders, ["channel name"]);

  // ── Report (Paid Ads) processing ──────────────────────────────────────────
  const rpHeaders = reportData?.headers ?? [];
  const rpRows = reportData?.rows ?? [];
  const rpDateIdx  = headerIdx(rpHeaders, ["day"]);
  const rpSpendIdx = headerIdx(rpHeaders, ["amount spent"]);
  const rpImpIdx   = headerIdx(rpHeaders, ["impressions"]);
  const rpReachIdx = headerIdx(rpHeaders, ["reach"]);
  const rpEngIdx   = headerIdx(rpHeaders, ["page engagement"]);

  // ── compute period metrics ────────────────────────────────────────────────
  const computePeriodMetrics = (start: string, end: string): PeriodMetrics => {
    const m = emptyMetrics();
    lsRows.forEach(r => {
      if (!inRange(r[lsDateIdx] ?? "", start, end)) return;
      m.revenue += parseNum(r[lsRevIdx] ?? "");
      m.items   += parseNum(r[lsQtyIdx] ?? "");
      m.views   += parseNum(r[lsViewIdx] ?? "");
      m.spend   += parseNum(r[lsSpendIdx] ?? "");
      m.sessions++;
    });
    daRows.forEach(r => {
      if (!inRange(r[daDateIdx] ?? "", start, end)) return;
      m.spend   += parseNum(r[daSpendIdx] ?? "");
      m.views   += parseNum(r[daOrigViewIdx] ?? "") + parseNum(r[daAdViewIdx] ?? "");
      m.adViews += parseNum(r[daAdViewIdx] ?? "");
      m.comments+= parseNum(r[daOrigCom] ?? "") + parseNum(r[daAdCom] ?? "");
      m.reactions+=parseNum(r[daOrigReact] ?? "") + parseNum(r[daAdReact] ?? "");
    });
    rpRows.forEach(r => {
      if (!inRange(r[rpDateIdx] ?? "", start, end)) return;
      m.spend      += parseNum(r[rpSpendIdx] ?? "");
      m.impressions+= parseNum(r[rpImpIdx] ?? "");
      m.reach      += parseNum(r[rpReachIdx] ?? "");
      m.engagement += parseNum(r[rpEngIdx] ?? "");
    });
    return m;
  };

  const metricsA = useMemo(() => computePeriodMetrics(pA.start, pA.end), [pA, lsRows, daRows, rpRows]);
  const metricsB = useMemo(() => computePeriodMetrics(pB.start, pB.end), [pB, lsRows, daRows, rpRows]);

  // ── channel comparison across all sheets (Daily Ads) ─────────────────────
  interface ChannelMetrics { spend: number; views: number; comments: number; reactions: number; }
  const channelMap = useMemo(() => {
    const m: Record<string, ChannelMetrics> = {};
    daRows.forEach(r => {
      const ch = r[daChIdx] ?? "Unknown";
      if (!m[ch]) m[ch] = { spend: 0, views: 0, comments: 0, reactions: 0 };
      m[ch].spend    += parseNum(r[daSpendIdx] ?? "");
      m[ch].views    += parseNum(r[daOrigViewIdx] ?? "") + parseNum(r[daAdViewIdx] ?? "");
      m[ch].comments += parseNum(r[daOrigCom] ?? "") + parseNum(r[daAdCom] ?? "");
      m[ch].reactions+= parseNum(r[daOrigReact] ?? "") + parseNum(r[daAdReact] ?? "");
    });
    return m;
  }, [daRows]);

  const channels = Object.keys(channelMap);

  // channel comparison chart data
  const channelChartData = [
    { metric: "Spend ($)", ...Object.fromEntries(channels.map(c => [c, channelMap[c].spend])) },
    { metric: "Views (K)", ...Object.fromEntries(channels.map(c => [c, +(channelMap[c].views / 1000).toFixed(1)])) },
    { metric: "Comments", ...Object.fromEntries(channels.map(c => [c, channelMap[c].comments])) },
    { metric: "Reactions", ...Object.fromEntries(channels.map(c => [c, channelMap[c].reactions])) },
  ];

  // ── Live Sales channel comparison ─────────────────────────────────────────
  interface LiveChanMetrics { revenue: number; views: number; sessions: number; items: number; }
  const liveChanMap = useMemo(() => {
    const m: Record<string, LiveChanMetrics> = {};
    lsRows.forEach(r => {
      const ch = r[lsChIdx] ?? "Unknown";
      if (!m[ch]) m[ch] = { revenue: 0, views: 0, sessions: 0, items: 0 };
      m[ch].revenue += parseNum(r[lsRevIdx] ?? "");
      m[ch].views   += parseNum(r[lsViewIdx] ?? "");
      m[ch].items   += parseNum(r[lsQtyIdx] ?? "");
      m[ch].sessions++;
    });
    return m;
  }, [lsRows]);

  const liveChanChartData = Object.entries(liveChanMap).map(([ch, d]) => ({
    channel: ch, ...d,
  }));

  // ── Channel name comparison (channel slots in Daily Ads) ──────────────────
  interface ChanNameMetrics { spend: number; views: number; }
  const chanNameMap = useMemo(() => {
    const m: Record<string, ChanNameMetrics> = {};
    daRows.forEach(r => {
      const ch = r[daChanNameIdx] ?? "Unknown";
      if (!m[ch]) m[ch] = { spend: 0, views: 0 };
      m[ch].spend += parseNum(r[daSpendIdx] ?? "");
      m[ch].views += parseNum(r[daOrigViewIdx] ?? "") + parseNum(r[daAdViewIdx] ?? "");
    });
    return m;
  }, [daRows]);

  const chanNameChartData = Object.entries(chanNameMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.spend - a.spend);

  // ── Creator leaderboard ───────────────────────────────────────────────────
  interface CreatorStats { revenue: number; items: number; views: number; sessions: number; }
  const creatorMap = useMemo(() => {
    const m: Record<string, CreatorStats> = {};
    lsRows.forEach(r => {
      const c = r[lsCreIdx] ?? "Unknown";
      if (!m[c]) m[c] = { revenue: 0, items: 0, views: 0, sessions: 0 };
      m[c].revenue += parseNum(r[lsRevIdx] ?? "");
      m[c].items   += parseNum(r[lsQtyIdx] ?? "");
      m[c].views   += parseNum(r[lsViewIdx] ?? "");
      m[c].sessions++;
    });
    return m;
  }, [lsRows]);

  const creatorLeaderboard = Object.entries(creatorMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Radar chart: channels normalized ──────────────────────────────────────
  const radarData = useMemo(() => {
    if (channels.length < 2) return [];
    const maxSpend = Math.max(...channels.map(c => channelMap[c].spend)) || 1;
    const maxViews = Math.max(...channels.map(c => channelMap[c].views)) || 1;
    const maxCom   = Math.max(...channels.map(c => channelMap[c].comments)) || 1;
    const maxReact = Math.max(...channels.map(c => channelMap[c].reactions)) || 1;
    return [
      { subject: "Spend",     ...Object.fromEntries(channels.map(c => [c, +((channelMap[c].spend / maxSpend) * 100).toFixed(0)])) },
      { subject: "Views",     ...Object.fromEntries(channels.map(c => [c, +((channelMap[c].views / maxViews) * 100).toFixed(0)])) },
      { subject: "Comments",  ...Object.fromEntries(channels.map(c => [c, +((channelMap[c].comments / maxCom) * 100).toFixed(0)])) },
      { subject: "Reactions", ...Object.fromEntries(channels.map(c => [c, +((channelMap[c].reactions / maxReact) * 100).toFixed(0)])) },
    ];
  }, [channelMap, channels]);

  const CHAN_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#f59e0b"];

  const formatMMK = (v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toLocaleString();

  const rankIcon = (i: number) => {
    if (i === 0) return <Award className="h-5 w-5 text-yellow-400" />;
    if (i === 1) return <Medal className="h-5 w-5 text-slate-300" />;
    if (i === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-mono text-sm w-5 text-center">#{i+1}</span>;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comparison Analysis</h1>
        <p className="text-muted-foreground mt-2">Side-by-side period, channel, and creator performance comparison.</p>
      </div>

      {/* ── SECTION 1: Period Comparison ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Period vs Period</h2>
            <p className="text-sm text-muted-foreground">Select two date ranges to compare performance side-by-side.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-muted-foreground/40 inline-block" />
              <Select value={periodA} onValueChange={setPeriodA}>
                <SelectTrigger className="w-44 bg-card/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-muted-foreground font-bold text-lg">vs</span>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary inline-block" />
              <Select value={periodB} onValueChange={setPeriodB}>
                <SelectTrigger className="w-44 bg-card/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <DeltaCard label="Revenue (MMK)" a={metricsA.revenue} b={metricsB.revenue} format={v => `${formatMMK(v)} MMK`} loading={isLoading} />
          <DeltaCard label="Total Spend ($)" a={metricsA.spend} b={metricsB.spend} format={v => formatCurrency(v)} loading={isLoading} />
          <DeltaCard label="Total Views" a={metricsA.views} b={metricsB.views} format={v => formatNumber(v)} loading={isLoading} />
          <DeltaCard label="Impressions" a={metricsA.impressions} b={metricsB.impressions} format={v => formatNumber(v)} loading={isLoading} />
          <DeltaCard label="Reach" a={metricsA.reach} b={metricsB.reach} format={v => formatNumber(v)} loading={isLoading} />
          <DeltaCard label="Engagement" a={metricsA.engagement} b={metricsB.engagement} format={v => formatNumber(v)} loading={isLoading} />
          <DeltaCard label="Comments" a={metricsA.comments} b={metricsB.comments} format={v => formatNumber(v)} loading={isLoading} />
          <DeltaCard label="Reactions" a={metricsA.reactions} b={metricsB.reactions} format={v => formatNumber(v)} loading={isLoading} />
        </div>

        {/* Period bar chart comparison */}
        <Card className="mt-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Period Metrics Comparison</CardTitle>
            <CardDescription>{pA.label} vs {pB.label}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px]" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    { metric: "Revenue (K MMK)", A: +(metricsA.revenue/1000).toFixed(0), B: +(metricsB.revenue/1000).toFixed(0) },
                    { metric: "Spend ($×10)",    A: +(metricsA.spend*10).toFixed(1), B: +(metricsB.spend*10).toFixed(1) },
                    { metric: "Views (K)",        A: +(metricsA.views/1000).toFixed(1), B: +(metricsB.views/1000).toFixed(1) },
                    { metric: "Impressions (K)",  A: +(metricsA.impressions/1000).toFixed(1), B: +(metricsB.impressions/1000).toFixed(1) },
                    { metric: "Engagement",       A: metricsA.engagement, B: metricsB.engagement },
                    { metric: "Comments",         A: metricsA.comments, B: metricsB.comments },
                  ]}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar dataKey="A" name={pA.label} fill="hsl(var(--muted-foreground))" fillOpacity={0.5} radius={[4,4,0,0]} />
                  <Bar dataKey="B" name={pB.label} fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 2: Channel Comparison ────────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Channel vs Channel</h2>
          <p className="text-sm text-muted-foreground">Performance breakdown by advertising platform.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Radar chart */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Channel Performance Radar</CardTitle>
              <CardDescription>Normalized 0–100 score per metric</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--border))" />
                    {channels.map((ch, i) => (
                      <Radar key={ch} name={ch} dataKey={ch} stroke={CHAN_COLORS[i]} fill={CHAN_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Grouped bar chart */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Spend vs Views by Platform</CardTitle>
              <CardDescription>Daily Ads Report — all data</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Legend />
                    {channels.map((ch, i) => (
                      <Bar key={ch} dataKey={ch} fill={CHAN_COLORS[i]} radius={[4,4,0,0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Channel name slot comparison */}
        <Card className="mt-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Spend by Channel Slot</CardTitle>
            <CardDescription>Channel 1, Channel 2, etc. — Daily Ads allocation</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px]" /> : (
              <div className="space-y-4">
                {chanNameChartData.map((ch, i) => {
                  const maxSpend = chanNameChartData[0]?.spend || 1;
                  const maxViews = Math.max(...chanNameChartData.map(c => c.views)) || 1;
                  const spendPct = (ch.spend / maxSpend) * 100;
                  const viewsPct = (ch.views / maxViews) * 100;
                  return (
                    <div key={i} className="grid grid-cols-[130px_1fr_1fr] gap-4 items-center">
                      <span className="text-sm font-medium truncate">{ch.name}</span>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Spend</span>
                          <span>{formatCurrency(ch.spend)}</span>
                        </div>
                        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${spendPct}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Views</span>
                          <span>{formatNumber(ch.views)}</span>
                        </div>
                        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${viewsPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Sales: TikTok vs Facebook */}
        <Card className="mt-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Live Sales — TikTok vs Facebook</CardTitle>
            <CardDescription>Revenue, views, items sold, and sessions by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px]" /> : (
              <div className="grid gap-6 lg:grid-cols-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={liveChanChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="channel" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatMMK(v)} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [`${formatMMK(v)} MMK`, "Revenue"]} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {liveChanChartData.map((ch, i) => (
                    <div key={i} className={`rounded-lg p-4 border ${i === 0 ? "border-pink-500/30 bg-pink-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">{ch.channel}</span>
                        <Badge variant="outline" className={i === 0 ? "border-pink-500/50 text-pink-400" : "border-blue-500/50 text-blue-400"}>
                          {ch.sessions} sessions
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{formatMMK(ch.revenue)}</p>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{ch.items}</p>
                          <p className="text-xs text-muted-foreground">Items</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{formatNumber(ch.views)}</p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 3: Creator Leaderboard ───────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Creator Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Live seller performance ranking by revenue generated.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Leaderboard table */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Revenue Ranking</CardTitle>
              <CardDescription>All time — from Live Sales Daily Report</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                )) : creatorLeaderboard.map((c, i) => {
                  const maxRevenue = creatorLeaderboard[0]?.revenue || 1;
                  const pct = (c.revenue / maxRevenue) * 100;
                  return (
                    <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i === 0 ? "bg-yellow-500/5" : i === 1 ? "bg-slate-400/5" : i === 2 ? "bg-amber-600/5" : ""}`}>
                      <div className="w-6 flex justify-center shrink-0">{rankIcon(i)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <div className="mt-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{formatMMK(c.revenue)} MMK</p>
                        <p className="text-xs text-muted-foreground">{c.sessions} sessions · {c.items} items</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Creator bar chart */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Revenue by Creator</CardTitle>
              <CardDescription>Visual comparison — top performers</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[320px]" /> : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={creatorLeaderboard.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => formatMMK(v)} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={110} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      formatter={(v: number, name: string) => {
                        if (name === "revenue") return [`${formatMMK(v)} MMK`, "Revenue"];
                        return [v, name];
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0,4,4,0]}>
                      {creatorLeaderboard.slice(0, 10).map((_, i) => (
                        <rect key={i} fill={i === 0 ? "hsl(var(--primary))" : `hsl(var(--primary) / ${Math.max(30, 100 - i * 8)}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessions and items per creator */}
        <Card className="mt-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Creator Activity Breakdown</CardTitle>
            <CardDescription>Sessions, items sold, and views per creator</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px]" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Rank</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Creator</th>
                      <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Revenue</th>
                      <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Sessions</th>
                      <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Items Sold</th>
                      <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Avg Rev/Session</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {creatorLeaderboard.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-4">
                          <div className="flex justify-center">{rankIcon(i)}</div>
                        </td>
                        <td className="py-2.5 pr-4 font-medium">{c.name}</td>
                        <td className="py-2.5 pr-4 text-right font-mono font-semibold">{formatMMK(c.revenue)} MMK</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-muted-foreground">{c.sessions}</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-muted-foreground">{c.items}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{c.sessions > 0 ? `${formatMMK(c.revenue / c.sessions)} MMK` : "—"}</td>
                        <td className="py-2.5 text-right font-mono text-muted-foreground">{formatNumber(c.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
