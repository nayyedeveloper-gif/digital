import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BarChart3,
  LineChart,
  TableProperties,
  TrendingUp,
  Activity,
  Video,
  Megaphone,
  Leaf,
  CalendarDays,
  Zap,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const OVERVIEW_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: TableProperties },
  { href: "/channels", label: "Channels", icon: BarChart3 },
  // { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/sheets", label: "Raw Data", icon: LineChart },
];

const REPORT_ITEMS = [
  { href: "/reports/live-sales", label: "Live Sales", icon: Video },
  { href: "/reports/paid-ads", label: "Paid Ads", icon: Megaphone },
  { href: "/reports/organic", label: "Organic", icon: Leaf },
  { href: "/reports/daily-posts", label: "Daily Posts", icon: CalendarDays },
  { href: "/reports/daily-ads", label: "Daily Ads", icon: Zap },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-background dark text-foreground">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-40 h-screen w-64 border-r border-border bg-card overflow-y-auto">
        <div className="flex h-16 items-center border-b border-border px-6 gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Digital Marketing</span>
        </div>

        <div className="py-6 px-4">
          {/* Intelligence section */}
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Intelligence
          </div>
          <nav className="flex flex-col gap-1 mb-4">
            {OVERVIEW_ITEMS.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Reports section */}
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reports
          </div>
          <nav className="flex flex-col gap-1">
            {REPORT_ITEMS.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <div className="h-full p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
