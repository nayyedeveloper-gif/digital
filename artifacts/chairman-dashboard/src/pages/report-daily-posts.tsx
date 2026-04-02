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
import { FileText, Users, CheckCircle, LayoutGrid } from "lucide-react";

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

export default function ReportDailyPosts() {
  const { data, isLoading } = useGetSheetData("Daily Report", {
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
  const iCreator = idx(["creator"]);
  const iPostType = idx(["post အမျိုးအစား"]);
  const iChannelName = idx(["channel အမည်"]);
  const iCategory = idx(["item categories"]);
  const iStatus = idx(["after posting"]);
  const iLink = idx(["post link"]);

  // KPIs
  const totalPosts = rows.length;
  const tikTokPosts = rows.filter(r => (r[iChannel] ?? "").toLowerCase().includes("tiktok")).length;
  const facebookPosts = rows.filter(r => (r[iChannel] ?? "").toLowerCase().includes("facebook")).length;
  const publishedPosts = rows.filter(r => (r[iStatus] ?? "").includes("တင်")).length;

  // By channel
  const channelMap: Record<string, number> = {};
  rows.forEach(r => {
    const ch = r[iChannel] ?? "Unknown";
    channelMap[ch] = (channelMap[ch] ?? 0) + 1;
  });
  const channelData = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  // By creator
  const creatorMap: Record<string, number> = {};
  rows.forEach(r => {
    const c = r[iCreator] ?? "Unknown";
    creatorMap[c] = (creatorMap[c] ?? 0) + 1;
  });
  const creatorData = Object.entries(creatorMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // By category
  const catMap: Record<string, number> = {};
  rows.forEach(r => {
    const c = r[iCategory] ?? "Other";
    catMap[c] = (catMap[c] ?? 0) + 1;
  });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Daily post count
  const dateMap: Record<string, number> = {};
  rows.forEach(r => {
    const d = r[iDate] ?? "";
    if (d) dateMap[d] = (dateMap[d] ?? 0) + 1;
  });
  const dateData = Object.entries(dateMap)
    .sort(([a], [b]) => {
      const pa = a.split("/").reverse().join("-");
      const pb = b.split("/").reverse().join("-");
      return pa.localeCompare(pb);
    })
    .map(([date, count]) => ({ date, count }));

  const channelBadge = (ch: string) => {
    const l = ch.toLowerCase();
    if (l.includes("tiktok")) return "border-pink-500/50 text-pink-400 bg-pink-500/10";
    if (l.includes("facebook")) return "border-blue-500/50 text-blue-400 bg-blue-500/10";
    return "border-muted-foreground/30 text-muted-foreground";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Posts Report</h1>
        <p className="text-muted-foreground mt-2">Content posting tracker — daily post log across TikTok and Facebook channels.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Posts" value={formatNumber(totalPosts)} icon={FileText} loading={isLoading} sub="All channels combined" />
        <MetricCard title="TikTok Posts" value={formatNumber(tikTokPosts)} icon={LayoutGrid} loading={isLoading} />
        <MetricCard title="Facebook Posts" value={formatNumber(facebookPosts)} icon={Users} loading={isLoading} />
        <MetricCard title="Published" value={formatNumber(publishedPosts)} icon={CheckCircle} loading={isLoading} sub="Successfully posted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Daily Post Count</CardTitle>
            <CardDescription>Posts published per day</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dateData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="count" name="Posts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>Posts by platform</CardDescription>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Posts by Creator</CardTitle>
            <CardDescription>Content volume per team member</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px]" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={creatorData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="count" name="Posts" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Posts by Item Category</CardTitle>
            <CardDescription>Content distribution by product type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px]" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Bar dataKey="value" name="Posts" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Post Log
            {!isLoading && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">{rows.length} entries</span>}
          </CardTitle>
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
                  <TableHead>Category</TableHead>
                  <TableHead>Channel Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : rows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{row[iDate] ?? ""}</TableCell>
                    <TableCell className="text-sm font-medium">{row[iCreator] ?? ""}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={channelBadge(row[iChannel] ?? "")}>
                        {row[iChannel] ?? ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row[iPostType] ?? ""}</TableCell>
                    <TableCell className="text-xs">{row[iCategory] ?? ""}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row[iChannelName] ?? ""}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        (row[iStatus] ?? "").includes("တင်")
                          ? "border-green-500/50 text-green-400 bg-green-500/10"
                          : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                      }>
                        {(row[iStatus] ?? "").substring(0, 12) || "—"}
                      </Badge>
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
