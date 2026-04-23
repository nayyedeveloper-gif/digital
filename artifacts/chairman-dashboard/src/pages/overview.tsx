import { useGetDashboardOverview, useGetMonthlyTrend, useGetChannels, useGetCampaigns } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { ArrowUpRight, DollarSign, Target, MousePointerClick, Percent, Eye, TrendingUp, TrendingDown, Activity, ChevronDown, ChevronUp, Info, Calendar } from "lucide-react";
import { useState } from "react";

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(210, 100%, 60%)', 'hsl(45, 100%, 60%)', 'hsl(160, 100%, 40%)'];

export default function Overview() {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  
  const { data: overview, isLoading: overviewLoading } = useGetDashboardOverview();
  const { data: trendData, isLoading: trendLoading } = useGetMonthlyTrend();
  const { data: channelData, isLoading: channelLoading } = useGetChannels();
  const { data: campaignData, isLoading: campaignLoading } = useGetCampaigns();

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

  // Channel breakdown data
  const channels = channelData?.channels || [];
  const paidChannels = channels.filter(c => c.channel.toLowerCase() !== 'organic');
  const channelPieData = paidChannels.map(c => ({
    name: c.channel,
    value: c.spend || 0
  }));

  // Top performing campaigns
  const campaigns = campaignData?.campaigns || [];
  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);

  // Calculate profit
  const profit = (overview?.totalRevenue || 0) - (overview?.totalSpend || 0);
  const profitMargin = overview?.totalRevenue ? (profit / overview.totalRevenue * 100) : 0;

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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Channel Performance</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Spend distribution by channel</CardDescription>
          </CardHeader>
          <CardContent>
            {channelLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {channelPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {paidChannels.slice(0, 3).map((channel, i) => (
                <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{channel.channel}</span>
                  </div>
                  <span className="text-muted-foreground">{formatCurrency(channel.spend || 0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Financial Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Revenue, spend, and profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-xs sm:text-sm font-medium">Net Profit</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-green-500">{formatCurrency(profit)}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-blue-500" />
                  <span className="text-xs sm:text-sm font-medium">Profit Margin</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-blue-500">{profitMargin.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span className="text-xs sm:text-sm font-medium">Avg. Revenue/Campaign</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-purple-500">
                  {overview?.activeCampaigns ? formatCurrency(overview.totalRevenue / overview.activeCampaigns) : "$0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-500" />
                  <span className="text-xs sm:text-sm font-medium">Conversion Rate</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-orange-500">
                  {overview?.totalClicks ? ((overview.totalConversions / overview.totalClicks) * 100).toFixed(2) : "0"}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Top Campaigns by Revenue</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Best performing campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {topCampaigns.map((campaign, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                        <p className="text-xs sm:text-sm font-medium truncate" title={campaign.name}>
                          {campaign.name.length > 25 ? campaign.name.substring(0, 25) + '...' : campaign.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ROI: {formatPercent(campaign.roi || 0)}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs sm:text-sm font-bold text-primary">{formatCurrency(campaign.revenue || 0)}</p>
                      <p className="text-xs text-muted-foreground">{campaign.conversions || 0} conv.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* More Details Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">More Details</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
            >
              {showMoreDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Additional metrics and data source information
          </CardDescription>
        </CardHeader>
        {showMoreDetails && (
          <CardContent className="space-y-6">
            {/* Data Source Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Data Source Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium">
                      {overview?.lastUpdated 
                        ? new Date(overview.lastUpdated).toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Campaigns:</span>
                    <span className="font-medium">{overview?.activeCampaigns || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Period:</span>
                    <span className="font-medium">Last 6 months</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Performance Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total ROI:</span>
                    <span className="font-medium text-green-500">
                      {overview ? formatPercent(overview.overallROI) : "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Margin:</span>
                    <span className="font-medium text-blue-500">
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion Rate:</span>
                    <span className="font-medium text-orange-500">
                      {overview?.totalClicks 
                        ? ((overview.totalConversions / overview.totalClicks) * 100).toFixed(2) 
                        : "0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Channel Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Detailed Channel Breakdown</h4>
              <div className="space-y-3">
                {channels.map((channel, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{channel.channel}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-muted-foreground">
                          Rev: {formatCurrency(channel.revenue || 0)}
                        </span>
                        <span className="text-muted-foreground">
                          Spend: {formatCurrency(channel.spend || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">ROI:</span>
                        <span className="ml-1 font-medium">{formatPercent(channel.roi || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CTR:</span>
                        <span className="ml-1 font-medium">{formatPercent(channel.ctr || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conv:</span>
                        <span className="ml-1 font-medium">{formatNumber(channel.conversions || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Campaigns Extended */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Top 10 Campaigns Performance</h4>
              <div className="space-y-2">
                {campaigns
                  .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                  .slice(0, 10)
                  .map((campaign, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">
                          {i + 1}. {campaign.name}
                        </span>
                      </div>
                      <div className="flex gap-4 ml-2">
                        <span className="text-muted-foreground">
                          {formatCurrency(campaign.revenue || 0)}
                        </span>
                        <span className={campaign.roi && campaign.roi > 0 ? "text-green-500" : "text-red-500"}>
                          {formatPercent(campaign.roi || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
