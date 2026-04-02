import { useCampaigns } from "@/lib/useGoogleSheets";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default function Campaigns() {
  const { data: campaignData, isLoading } = useCampaigns();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground mt-2">Detailed performance breakdown for all active and historical campaigns.</p>
      </div>

      <div className="rounded-md border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[250px]">Campaign Name</TableHead>
              <TableHead>Channel</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : campaignData?.campaigns.map((campaign, i) => (
              <TableRow key={i} className="hover:bg-muted/30">
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {campaign.channel}
                  </span>
                </TableCell>
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
            {!isLoading && campaignData?.campaigns.length === 0 && (
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
