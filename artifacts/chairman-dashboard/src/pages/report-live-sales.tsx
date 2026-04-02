import { useGetSheetData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ShoppingCart, Eye, Users, TrendingUp } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6"];

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

export default function ReportLiveSales() {
  const { data, isLoading } = useGetSheetData("Live Sales Daily Report", {
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

  const iRevenue = idx(["ရောင်းရသော ငွေပမာဏ"]);
  const iQty = idx(["ရောင်းရသော ပစ္စည်း အရေအတွက်"]);
  const iViews = idx(["view"]);
  const iChannel = idx(["social type"]);
  const iCreator = idx(["creator အမည်"]);
  const iDate = idx(["ရက်စွဲ"]);
  const iType = idx(["live အမျိုးအစား", "live"]);
  const iSpend = idx(["ads spend amount"]);

  const parseNum = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;

  const totalRevenue = rows.reduce((s, r) => s + parseNum(r[iRevenue] ?? ""), 0);
  const totalQty = rows.reduce((s, r) => s + parseNum(r[iQty] ?? ""), 0);
  const totalViews = rows.reduce((s, r) => s + parseNum(r[iViews] ?? ""), 0);
  const totalSessions = rows.length;

  // Revenue by creator
  const creatorMap: Record<string, number> = {};
  rows.forEach(r => {
    const creator = r[iCreator] ?? "Unknown";
    creatorMap[creator] = (creatorMap[creator] ?? 0) + parseNum(r[iRevenue] ?? "");
  });
  const creatorData = Object.entries(creatorMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Sessions by channel
  const channelMap: Record<string, number> = {};
  rows.forEach(r => {
    const ch = r[iChannel] ?? "Unknown";
    channelMap[ch] = (channelMap[ch] ?? 0) + 1;
  });
  const channelData = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  // Revenue by date
  const dateMap: Record<string, number> = {};
  rows.forEach(r => {
    const d = r[iDate] ?? "";
    if (d) dateMap[d] = (dateMap[d] ?? 0) + parseNum(r[iRevenue] ?? "");
  });
  const dateData = Object.entries(dateMap)
    .sort(([a], [b]) => {
      const pa = a.split("/").reverse().join("-");
      const pb = b.split("/").reverse().join("-");
      return pa.localeCompare(pb);
    })
    .slice(-20)
    .map(([date, revenue]) => ({ date, revenue }));

  const formatMMK = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v.toLocaleString();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Sales Report</h1>
        <p className="text-muted-foreground mt-2">Live session performance — revenue, items sold, and viewer engagement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Revenue (MMK)" value={`${formatMMK(totalRevenue)} MMK`} icon={TrendingUp} loading={isLoading} sub="From all live sessions" />
        <MetricCard title="Items Sold" value={formatNumber(totalQty)} icon={ShoppingCart} loading={isLoading} sub="Total quantity" />
        <MetricCard title="Total Views" value={formatNumber(totalViews)} icon={Eye} loading={isLoading} sub="Across all live streams" />
        <MetricCard title="Live Sessions" value={formatNumber(totalSessions)} icon={Users} loading={isLoading} sub="Total sessions logged" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Revenue by Date (MMK)</CardTitle>
            <CardDescription>Daily live sale revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dateData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${formatMMK(v)}`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} formatter={(v: number) => [`${formatMMK(v)} MMK`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Sessions by Channel</CardTitle>
            <CardDescription>TikTok vs Facebook live distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" nameKey="name" paddingAngle={4} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Revenue by Creator (Top 10)</CardTitle>
          <CardDescription>Best performing live sellers by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[220px]" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={creatorData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${formatMMK(v)}`} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [`${formatMMK(v)} MMK`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Live Sessions Log
            {!isLoading && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">{rows.length} sessions</span>}
          </CardTitle>
          <CardDescription>All recorded live sales sessions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Revenue (MMK)</TableHead>
                  <TableHead className="text-right">Items Sold</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                )) : rows.map((row, i) => {
                  const revenue = parseNum(row[iRevenue] ?? "");
                  const qty = parseNum(row[iQty] ?? "");
                  return (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{row[iDate] ?? ""}</TableCell>
                      <TableCell className="font-medium text-sm">{row[iCreator] ?? ""}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          (row[iChannel] ?? "").toLowerCase().includes("tiktok")
                            ? "border-pink-500/50 text-pink-400 bg-pink-500/10"
                            : "border-blue-500/50 text-blue-400 bg-blue-500/10"
                        }>
                          {row[iChannel] ?? ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row[iType] ?? ""}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{revenue > 0 ? formatMMK(revenue) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{qty > 0 ? formatNumber(qty) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatNumber(parseNum(row[iViews] ?? ""))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
