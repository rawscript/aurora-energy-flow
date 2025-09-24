/**
 * Type definitions for KPLC token system
 */

// Token analytics interface
export interface TokenAnalytics {
  current_balance: number;
  daily_consumption_avg: number;
  estimated_days_remaining: number;
  monthly_spending: number;
  last_purchase_date: string | null;
  consumption_trend: 'increasing' | 'decreasing' | 'stable';
  last_updated: string | null;
  data_source: 'cache' | 'database' | 'kplc_api' | 'solar_api' | 'no_meter';
  cache_hit: boolean;
  weekly_kwh_consumed?: number;
  weekly_cost?: number;
}

// Token transaction interface
export interface TokenTransaction {
  id: string;
  transaction_type: 'purchase' | 'consumption' | 'refund' | 'adjustment';
  amount: number;
  token_units?: number;
  token_code?: string;
  transaction_date: string;
  reference_number?: string;
  vendor?: string;
  payment_method?: string;
  balance_before: number;
  balance_after: number;
  status: string;
  metadata?: any;
  provider?: 'KPLC' | 'Solar' | 'SunCulture' | 'M-KOPA Solar' | 'IPP' | 'Other' | '' | string;
}

// KPLC balance interface
export interface KPLCBalance {
  success: boolean;
  balance: number;
  meter_number: string;
  last_updated: string;
  source: 'cache' | 'kplc_api' | 'solar_api' | 'mock';
  our_balance?: number;
}

// Type guard for TokenAnalytics
export function isTokenAnalytics(obj: any): obj is TokenAnalytics {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.current_balance === 'number' &&
    typeof obj.daily_consumption_avg === 'number' &&
    typeof obj.estimated_days_remaining === 'number' &&
    typeof obj.monthly_spending === 'number';
}

// Type guard for TokenTransaction
export function isTokenTransaction(obj: any): obj is TokenTransaction {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.transaction_type === 'string' &&
    typeof obj.amount === 'number' &&
    typeof obj.transaction_date === 'string' &&
    typeof obj.balance_before === 'number' &&
    typeof obj.balance_after === 'number' &&
    typeof obj.status === 'string';
}

// Type guard for KPLCBalance
export function isKPLCBalance(obj: any): obj is KPLCBalance {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    typeof obj.balance === 'number' &&
    typeof obj.meter_number === 'string' &&
    typeof obj.last_updated === 'string' &&
    typeof obj.source === 'string';
}