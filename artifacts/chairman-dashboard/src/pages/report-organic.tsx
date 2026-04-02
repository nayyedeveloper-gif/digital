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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Eye, Users, MousePointerClick, Heart } from "lucide-react";

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

export default function ReportOrganic() {
  const { data, isLoading } = useGetSheetData("Organic Report", {
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

  const iDate = idx(["publish time"]);
  const iTitle = idx(["title"]);
  const iType = idx(["post type"]);
  const iViews = idx(["views"]);
  const iReach = idx(["reach"]);
  const iEngagement = idx(["reactions, comments"]);
  const iClicks = idx(["total clicks"]);
  const iPermalink = idx(["permalink"]);

  const parseNum = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;

  const totalViews = rows.reduce((s, r) => s + parseNum(r[iViews] ?? ""), 0);
  const totalReach = rows.reduce((s, r) => s + parseNum(r[iReach] ?? ""), 0);
  const totalClicks = rows.reduce((s, r) => s + parseNum(r[iClicks] ?? ""), 0);
  const totalEngagement = rows.reduce((s, r) => s + parseNum(r[iEngagement] ?? ""), 0);

  // By post type
  const typeMap: Record<string, { views: number; reach: number; clicks: number; count: number }> = {};
  rows.forEach(r => {
    const t = r[iType] ?? "Other";
    if (!typeMap[t]) typeMap[t] = { views: 0, reach: 0, clicks: 0, count: 0 };
    typeMap[t].views += parseNum(r[iViews] ?? "");
    typeMap[t].reach += parseNum(r[iReach] ?? "");
    typeMap[t].clicks += parseNum(r[iClicks] ?? "");
    typeMap[t].count++;
  });
  const typeData = Object.entries(typeMap).map(([type, d]) => ({ type, ...d })).sort((a, b) => b.views - a.views);

  // Daily trend
  const dateMap: Record<string, { views: number; reach: number; clicks: number }> = {};
  rows.forEach(r => {
    const raw = r[iDate] ?? "";
    const d = raw.split(" ")[0];
    if (!d) return;
    if (!dateMap[d]) dateMap[d] = { views: 0, reach: 0, clicks: 0 };
    dateMap[d].views += parseNum(r[iViews] ?? "");
    dateMap[d].reach += parseNum(r[iReach] ?? "");
    dateMap[d].clicks += parseNum(r[iClicks] ?? "");
  });
  const dateData = Object.entries(dateMap)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, d]) => ({ date: date.slice(5), ...d }));

  // Top posts
  const topPosts = [...rows]
    .sort((a, b) => parseNum(b[iViews] ?? "") - parseNum(a[iViews] ?? ""))
    .slice(0, 5);

  const typeColor: Record<string, string> = {
    Photos: "border-blue-500/50 text-blue-400 bg-blue-500/10",
    Video: "border-purple-500/50 text-purple-400 bg-purple-500/10",
    Live: "border-red-500/50 text-red-400 bg-red-500/10",
    Reels: "border-pink-500/50 text-pink-400 bg-pink-500/10",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organic Report</h1>
        <p className="text-muted-foreground mt-2">Organic Facebook page post performance — views, reach, and engagement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Views" value={formatNumber(totalViews)} icon={Eye} loading={isLoading} />
        <MetricCard title="Total Reach" value={formatNumber(totalReach)} icon={Users} loading={isLoading} sub="Unique accounts" />
        <MetricCard title="Total Clicks" value={formatNumber(totalClicks)} icon={MousePointerClick} loading={isLoading} />
        <MetricCard title="Total Engagement" value={formatNumber(totalEngagement)} icon={Heart} loading={isLoading} sub="Reactions + comments + shares" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Daily Views & Reach</CardTitle>
            <CardDescription>Organic reach trend over time</CardDescription>
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
                  <Line type="monotone" dataKey="views" name="Views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reach" name="Reach" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Performance by Post Type</CardTitle>
            <CardDescription>Views breakdown: Photos, Video, Live, Reels</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v)} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [formatNumber(v)]} />
                  <Bar dataKey="views" name="Views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reach" name="Reach" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Top Posts by Views</CardTitle>
          <CardDescription>5 highest performing organic posts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />) :
              topPosts.map((row, i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="text-2xl font-bold text-muted-foreground/40 w-8 shrink-0">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{row[iTitle] ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{row[iDate] ?? ""}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className={typeColor[(row[iType] ?? "")] ?? "border-muted-foreground/30 text-muted-foreground"}>
                      {row[iType] ?? ""}
                    </Badge>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatNumber(parseNum(row[iViews] ?? ""))}</div>
                      <div className="text-xs text-muted-foreground">views</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            All Posts
            {!isLoading && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">{rows.length} posts</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead>Published</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : rows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs whitespace-nowrap">{row[iDate] ?? ""}</TableCell>
                    <TableCell className="text-sm max-w-[280px]">
                      {iPermalink !== -1 && row[iPermalink] ? (
                        <a href={row[iPermalink]} target="_blank" rel="noopener noreferrer" className="hover:text-primary line-clamp-2 transition-colors">
                          {row[iTitle] ?? ""}
                        </a>
                      ) : <span className="line-clamp-2">{row[iTitle] ?? ""}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeColor[row[iType] ?? ""] ?? "border-muted-foreground/30 text-muted-foreground"}>
                        {row[iType] ?? ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(parseNum(row[iViews] ?? ""))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(parseNum(row[iReach] ?? ""))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(parseNum(row[iEngagement] ?? ""))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(parseNum(row[iClicks] ?? ""))}</TableCell>
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
