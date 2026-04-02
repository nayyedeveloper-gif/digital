import { useGetCampaigns } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(210, 100%, 60%)', 'hsl(45, 100%, 60%)', 'hsl(160, 100%, 40%)'];

export default function Campaigns() {
  const { data: campaignData, isLoading } = useGetCampaigns();

  const campaigns = campaignData?.campaigns || [];

  // Aggregate data by channel for charts
  const channelData = campaigns.reduce((acc, campaign) => {
    const channel = campaign.channel;
    if (!acc[channel]) {
      acc[channel] = { channel, spend: 0, revenue: 0, conversions: 0, count: 0 };
    }
    acc[channel].spend += campaign.spend || 0;
    acc[channel].revenue += campaign.revenue || 0;
    acc[channel].conversions += campaign.conversions || 0;
    acc[channel].count += 1;
    return acc;
  }, {} as Record<string, { channel: string; spend: number; revenue: number; conversions: number; count: number }>);

  const channelChartData = Object.values(channelData);
  
  // Filter out Organic channel for pie chart
  const paidChannelData = channelChartData.filter(d => 
    d.channel.toLowerCase() !== 'organic'
  );
  
  // Calculate total spend for percentage display (excluding Organic)
  const totalSpend = paidChannelData.reduce((sum, d) => sum + d.spend, 0);
  
  // Use campaign count for pie chart to ensure all channels are visible
  const pieData = paidChannelData.map(d => ({ 
    name: d.channel, 
    value: d.count,
    spend: d.spend,
    percentage: totalSpend > 0 ? (d.spend / totalSpend * 100) : 0
  }));

  // Top campaigns by spend
  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.spend || 0) - (a.spend || 0))
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 30 ? c.name.substring(0, 30) + '...' : c.name,
      spend: c.spend || 0,
      revenue: c.revenue || 0
    }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground mt-2">Detailed performance breakdown for all active and historical campaigns.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Spend Distribution by Channel</CardTitle>
            <CardDescription>Budget allocation across channels</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, payload }) => `${name}: ${payload.percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        formatCurrency(props.payload.spend),
                        'Spend'
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Top Campaigns by Spend</CardTitle>
            <CardDescription>Highest spending campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCampaigns} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead className="w-[250px]">Campaign Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">ROI</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead className="text-right">CPA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : campaignData?.campaigns?.map((campaign, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {campaign.channel}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                      campaign.status.toLowerCase() === 'active' 
                        ? 'border-primary/50 text-primary bg-primary/10' 
                        : 'border-muted-foreground/30 text-muted-foreground'
                    }
                  >
                    {campaign.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(campaign.spend)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(campaign.revenue)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-primary">
                  {formatPercent(campaign.roi)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{formatNumber(campaign.conversions)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(campaign.cpa)}</TableCell>
              </TableRow>
            ))}
            {!isLoading && campaignData?.campaigns?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No campaigns found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
