import { useGetSheetData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "recharts";
import { DollarSign, Eye, Users, MousePointerClick } from "lucide-react";

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

export default function ReportPaidAds() {
  const { data, isLoading } = useGetSheetData("Report", {
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

  const iDate = idx(["day"]);
  const iCampaign = idx(["campaign name"]);
  const iPage = idx(["page name"]);
  const iSpend = idx(["amount spent"]);
  const iImpressions = idx(["impressions"]);
  const iReach = idx(["reach"]);
  const iEngagement = idx(["page engagement"]);

  const parseNum = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;

  const totalSpend = rows.reduce((s, r) => s + parseNum(r[iSpend] ?? ""), 0);
  const totalImpressions = rows.reduce((s, r) => s + parseNum(r[iImpressions] ?? ""), 0);
  const totalReach = rows.reduce((s, r) => s + parseNum(r[iReach] ?? ""), 0);
  const totalEngagement = rows.reduce((s, r) => s + parseNum(r[iEngagement] ?? ""), 0);

  // Daily spend + impressions trend
  const dateMap: Record<string, { spend: number; impressions: number; reach: number; engagement: number }> = {};
  rows.forEach(r => {
    const d = r[iDate] ?? "";
    if (!d) return;
    if (!dateMap[d]) dateMap[d] = { spend: 0, impressions: 0, reach: 0, engagement: 0 };
    dateMap[d].spend += parseNum(r[iSpend] ?? "");
    dateMap[d].impressions += parseNum(r[iImpressions] ?? "");
    dateMap[d].reach += parseNum(r[iReach] ?? "");
    dateMap[d].engagement += parseNum(r[iEngagement] ?? "");
  });
  const dateData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d }));

  // Top campaigns by spend
  const campaignMap: Record<string, { spend: number; impressions: number; engagement: number }> = {};
  rows.forEach(r => {
    const name = (r[iCampaign] ?? "").substring(0, 40);
    if (!name) return;
    if (!campaignMap[name]) campaignMap[name] = { spend: 0, impressions: 0, engagement: 0 };
    campaignMap[name].spend += parseNum(r[iSpend] ?? "");
    campaignMap[name].impressions += parseNum(r[iImpressions] ?? "");
    campaignMap[name].engagement += parseNum(r[iEngagement] ?? "");
  });
  const topCampaigns = Object.entries(campaignMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paid Ads Report</h1>
        <p className="text-muted-foreground mt-2">Facebook paid campaign performance — spend, impressions, reach, and engagement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Spend (USD)" value={formatCurrency(totalSpend)} icon={DollarSign} loading={isLoading} sub="Facebook ad spend" />
        <MetricCard title="Total Impressions" value={formatNumber(totalImpressions)} icon={Eye} loading={isLoading} />
        <MetricCard title="Total Reach" value={formatNumber(totalReach)} icon={Users} loading={isLoading} sub="Unique accounts reached" />
        <MetricCard title="Total Engagement" value={formatNumber(totalEngagement)} icon={MousePointerClick} loading={isLoading} sub="Reactions + comments + shares" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Daily Spend (USD)</CardTitle>
            <CardDescription>Ad spend over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dateData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-40} textAnchor="end" interval={0} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [formatCurrency(v), "Spend"]} />
                  <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Impressions & Reach Trend</CardTitle>
            <CardDescription>Daily audience coverage</CardDescription>
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
                  <Line type="monotone" dataKey="impressions" name="Impressions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reach" name="Reach" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Top Campaigns by Spend</CardTitle>
          <CardDescription>Highest spending ad campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[240px]" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCampaigns} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={200} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} formatter={(v: number) => [formatCurrency(v), "Spend"]} />
                <Bar dataKey="spend" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Campaign Log
            {!isLoading && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">{rows.length} entries</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Spend ($)</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : rows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{row[iDate] ?? ""}</TableCell>
                    <TableCell className="text-sm max-w-[260px] truncate">{row[iCampaign] ?? ""}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{row[iPage] ?? ""}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(parseNum(row[iSpend] ?? ""))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(parseNum(row[iImpressions] ?? ""))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(parseNum(row[iReach] ?? ""))}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNumber(parseNum(row[iEngagement] ?? ""))}</TableCell>
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
