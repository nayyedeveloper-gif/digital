import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(val: number): string {
  if (val == null || isNaN(val)) return '$0';
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toLocaleString()}`;
}

export function formatNumber(val: number): string {
  if (val == null || isNaN(val)) return '0';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString();
}

export function formatPercent(val: number): string {
  if (val == null || isNaN(val)) return '0.0%';
  // Cap extremely large percentages for display
  if (val >= 100000) return `${(val / 1000).toFixed(0)}K%`;
  if (val >= 10000) return `${(val / 1000).toFixed(1)}K%`;
  if (val >= 1000) return `${val.toFixed(0)}%`;
  return `${val.toFixed(1)}%`;
}
