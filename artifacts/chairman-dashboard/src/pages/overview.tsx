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
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary flex-shrink-0" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-6 sm:h-8 w-[80px] sm:w-[100px]" />
        ) : (
          <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground break-all">{value}</div>
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 md:px-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Executive Overview</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2">Real-time aggregate performance metrics across all active campaigns.</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Revenue vs. Spend Trend</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Monthly performance comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[250px] sm:h-[350px] md:h-[400px] w-full" />
            ) : (
              <div className="h-[250px] sm:h-[350px] md:h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sanitizedTrendData} margin={{ top: 10, right: window.innerWidth < 640 ? 10 : 30, left: 0, bottom: 0 }}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={window.innerWidth < 640 ? 10 : 12}
                      angle={window.innerWidth < 640 ? -45 : 0}
                      textAnchor={window.innerWidth < 640 ? "end" : "middle"}
                      height={window.innerWidth < 640 ? 60 : 30}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={window.innerWidth < 640 ? 10 : 12}
                      tickFormatter={(value) => `$${value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}`}
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

        <Card className="lg:col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Quick Insights</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Efficiency metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between border-b border-border/50 pb-3 sm:pb-4">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium leading-none">Cost Per Acquisition (CPA)</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Average cost per conversion</p>
                  </div>
                  <div className="font-bold text-lg sm:text-xl">{overview ? formatCurrency(overview.overallCPA) : "$0"}</div>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-3 sm:pb-4">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium leading-none">Cost Per Click (CPC)</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Average cost per click</p>
                  </div>
                  <div className="font-bold text-lg sm:text-xl">{overview ? formatCurrency(overview.overallCPC) : "$0"}</div>
                </div>
                <div className="flex items-center justify-between border-b border-border/50 pb-3 sm:pb-4">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium leading-none">Click-Through Rate (CTR)</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Clicks vs Impressions</p>
                  </div>
                  <div className="font-bold text-lg sm:text-xl text-primary">{overview ? formatPercent(overview.overallCTR) : "0%"}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium leading-none">Active Campaigns</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Currently running</p>
                  </div>
                  <div className="font-bold text-lg sm:text-xl text-accent">{overview?.activeCampaigns || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
