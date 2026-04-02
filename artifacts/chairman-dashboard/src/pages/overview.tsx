import { useGetDashboardOverview, useGetMonthlyTrend } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowUpRight, DollarSign, Target, MousePointerClick, Percent, Eye } from "lucide-react";

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  loading 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  loading: boolean;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-[100px]" />
        ) : (
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const { data: overview, isLoading: overviewLoading } = useGetDashboardOverview();
  const { data: trendData, isLoading: trendLoading } = useGetMonthlyTrend();

  // Sanitize chart data to prevent SVG path errors
  const sanitizedTrendData = (trendData?.trend || []).filter(item => {
    const revenue = Number(item.revenue);
    const spend = Number(item.spend);
    return !isNaN(revenue) && !isNaN(spend) && isFinite(revenue) && isFinite(spend);
  }).map(item => ({
    ...item,
    revenue: Number(item.revenue) || 0,
    spend: Number(item.spend) || 0
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Overview</h1>
        <p className="text-muted-foreground mt-2">Real-time aggregate performance metrics across all active campaigns.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard 
          title="Total Revenue" 
          value={overview ? formatCurrency(overview.totalRevenue) : "$0"} 
          icon={DollarSign}
          loading={overviewLoading}
        />
        <MetricCard 
          title="Total Spend" 
          value={overview ? formatCurrency(overview.totalSpend) : "$0"} 
          icon={ArrowUpRight}
          loading={overviewLoading}
        />
        <MetricCard 
          title="Overall ROI" 
          value={overview ? formatPercent(overview.overallROI) : "0%"} 
          icon={Percent}
          loading={overviewLoading}
        />
        <MetricCard 
          title="Total Conversions" 
          value={overview ? formatNumber(overview.totalConversions) : "0"} 
          icon={Target}
          loading={overviewLoading}
        />
        <MetricCard 
          title="Total Clicks" 
          value={overview ? formatNumber(overview.totalClicks) : "0"} 
          icon={MousePointerClick}
          loading={overviewLoading}
        />
        <MetricCard 
          title="Impressions" 
          value={overview ? formatNumber(overview.totalImpressions) : "0"} 
          icon={Eye}
          loading={overviewLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Revenue vs Spend Trend</CardTitle>
            <CardDescription>Monthly aggregate performance</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            {trendLoading ? (
              <Skeleton className="h-[300px] w-full ml-6" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sanitizedTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="spend" name="Spend" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
            <CardDescription>Efficiency metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Cost Per Acquisition (CPA)</p>
                    <p className="text-sm text-muted-foreground">Average cost per conversion</p>
                  </div>
                  <div className="font-bold text-xl">{overview ? formatCurrency(overview.overallCPA) : "$0"}</div>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Cost Per Click (CPC)</p>
                    <p className="text-sm text-muted-foreground">Average cost per click</p>
                  </div>
                  <div className="font-bold text-xl">{overview ? formatCurrency(overview.overallCPC) : "$0"}</div>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Click-Through Rate (CTR)</p>
                    <p className="text-sm text-muted-foreground">Clicks vs Impressions</p>
                  </div>
                  <div className="font-bold text-xl text-primary">{overview ? formatPercent(overview.overallCTR) : "0%"}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Active Campaigns</p>
                    <p className="text-sm text-muted-foreground">Currently running</p>
                  </div>
                  <div className="font-bold text-xl text-accent">{overview?.activeCampaigns || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
