import { useGetSheetData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, Eye, MessageSquare, Share2 } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#f59e0b", "#ec4899"];

function MetricCard({ title, value, icon: Icon, loading, sub }: { title: string; value: string; sub?: string; icon: any; loading: boolean }) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-[120px]" /> : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportDailyAds() {
  const { data, isLoading } = useGetSheetData("Daily Ads Report", {
    query: { enabled: true },
  });

  const headers = data?.headers ?? [];
  const rows = data?.rows ?? [];

  const idx = (names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.toLowerCase().includes(n.toLowerCase()));
      if (i !== -1) return i;
    }
    return -1;
  };

  const iDate = idx(["ရက်စွဲ"]);
  const iChannel = idx(["social type"]);
  const iAdsAccount = idx(["ads account"]);
  const iChannelName = idx(["channel name"]);
  const iSpendUSD = idx(["ads spend amount ($)"]);
  const iSpendMMK = idx(["ads spend amount (mmks)"]);
  const iOrigViews = idx(["original views"]);
  const iOrigShare = idx(["original share"]);
  const iOrigComments = idx(["original comments"]);
  const iOrigReaction = idx(["original reaction"]);
  const iAdShare = idx(["ad share"]);
  const iAdComments = idx(["ad comments"]);
  const iAdReaction = idx(["ad reaction"]);
  const iAdViews = idx(["ad views"]);

  const parseNum = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;

  const totalSpendUSD = rows.reduce((s, r) => s + parseNum(r[iSpendUSD] ?? ""), 0);
  const totalSpendMMK = rows.reduce((s, r) => s + parseNum(r[iSpendMMK] ?? ""), 0);
  const totalOrigViews = rows.reduce((s, r) => s + parseNum(r[iOrigViews] ?? ""), 0);
  const totalAdViews = rows.reduce((s, r) => s + parseNum(r[iAdViews] ?? ""), 0);
  const totalViews = totalOrigViews + totalAdViews;
  const totalComments = rows.reduce((s, r) => s + parseNum(r[iOrigComments] ?? "") + parseNum(r[iAdComments] ?? ""), 0);
  const totalReactions = rows.reduce((s, r) => s + parseNum(r[iOrigReaction] ?? "") + parseNum(r[iAdReaction] ?? ""), 0);

  // Daily spend trend
  const dateMap: Record<string, { spendUSD: number; origViews: number; adViews: number }> = {};
  rows.forEach(r => {
    const d = r[iDate] ?? "";
    if (!d) return;
    if (!dateMap[d]) dateMap[d] = { spendUSD: 0, origViews: 0, adViews: 0 };
    dateMap[d].spendUSD += parseNum(r[iSpendUSD] ?? "");
    dateMap[d].origViews += parseNum(r[iOrigViews] ?? "");
    dateMap[d].adViews += parseNum(r[iAdViews] ?? "");
  });
  const dateData = Object.entries(dateMap)
    .sort(([a], [b]) => {
      const pa = a.split("/").reverse().join("-");
      const pb = b.split("/").reverse().join("-");
      return pa.localeCompare(pb);
    })
    .map(([date, d]) => ({ date, ...d }));

  // Spend by channel
  const channelMap: Record<string, { spend: number; views: number }> = {};
  rows.forEach(r => {
    const ch = r[iChannel] ?? "Unknown";
    if (!channelMap[ch]) channelMap[ch] = { spend: 0, views: 0 };
    channelMap[ch].spend += parseNum(r[iSpendUSD] ?? "");
    channelMap[ch].views += parseNum(r[iOrigViews] ?? "") + parseNum(r[iAdViews] ?? "");
  });
  const channelData = Object.entries(channelMap).map(([name, d]) => ({ name, ...d }));

  // Spend by channel name
  const chanNameMap: Record<string, number> = {};
  rows.forEach(r => {
    const ch = r[iChannelName] ?? "Unknown";
    chanNameMap[ch] = (chanNameMap[ch] ?? 0) + parseNum(r[iSpendUSD] ?? "");
  });
  const chanNameData = Object.entries(chanNameMap).map(([name, value]) => ({ name, value }));

  const channelBadge = (ch: string) => {
    const l = ch.toLowerCase();
    if (l.includes("tiktok")) return "border-pink-500/50 text-pink-400 bg-pink-500/10";
    if (l.includes("facebook")) return "border-blue-500/50 text-blue-400 bg-blue-500/10";
    return "border-muted-foreground/30 text-muted-foreground";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Ads Report</h1>
        <p className="text-muted-foreground mt-2">Paid ad performance tracker — daily spend, views, and engagement per channel.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Spend (USD)" value={formatCurrency(totalSpendUSD)} icon={DollarSign} loading={isLoading} sub={`≈ ${(totalSpendMMK / 1000).toFixed(0)}K MMK`} />
        <MetricCard title="Total Views" value={formatNumber(totalViews)} icon={Eye} loading={isLoading} sub={`Organic: ${formatNumber(totalOrigViews)} | Ad: ${formatNumber(totalAdViews)}`} />
        <MetricCard title="Total Comments" value={formatNumber(totalComments)} icon={MessageSquare} loading={isLoading} />
        <MetricCard title="Total Reactions" value={formatNumber(totalReactions)} icon={Share2} loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Daily Spend (USD)</CardTitle>
            <CardDescription>Ad spend trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dateData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [formatCurrency(v), "Spend"]} />
                  <Bar dataKey="spendUSD" name="Spend ($)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Organic vs Ad Views</CardTitle>
            <CardDescription>Daily view breakdown by source</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dateData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v)} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [formatNumber(v)]} />
                  <Legend />
                  <Line type="monotone" dataKey="origViews" name="Organic Views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="adViews" name="Ad Views" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Spend by Platform</CardTitle>
            <CardDescription>Facebook vs TikTok allocation</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {isLoading ? <Skeleton className="h-[240px] w-full" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="spend" nameKey="name" paddingAngle={4} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [formatCurrency(v), "Spend"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Spend by Channel Name</CardTitle>
            <CardDescription>Budget breakdown per channel slot</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[240px]" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chanNameData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [formatCurrency(v), "Spend"]} />
                  <Bar dataKey="value" name="Spend ($)" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Daily Ads Log
            {!isLoading && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">{rows.length} entries</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Spend ($)</TableHead>
                  <TableHead className="text-right">Spend (MMK)</TableHead>
                  <TableHead className="text-right">Orig. Views</TableHead>
                  <TableHead className="text-right">Ad Views</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : rows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{row[iDate] ?? ""}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={channelBadge(row[iChannel] ?? "")}>
                        {row[iChannel] ?? ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row[iAdsAccount] ?? ""}</TableCell>
                    <TableCell className="text-xs">{row[iChannelName] ?? ""}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{row[iSpendUSD] ?? ""}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatNumber(parseNum(row[iSpendMMK] ?? ""))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{row[iOrigViews] ? formatNumber(parseNum(row[iOrigViews])) : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{row[iAdViews] ? formatNumber(parseNum(row[iAdViews])) : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatNumber(parseNum(row[iOrigComments] ?? "") + parseNum(row[iAdComments] ?? ""))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
