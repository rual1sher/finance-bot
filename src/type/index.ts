export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  comment: string | null;
  created_at: string;
}

export interface RecentTransactionItem extends Transaction {
  icon?: string | null;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  icon?: string | null;
  type: 'expense' | 'income';
}

export interface CategoryReportItem {
  category: string;
  total: number;
  percentage: number;
  icon?: string | null;
}

export interface PeriodReport {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  startDate: Date;
  endDate: Date;
  items: CategoryReportItem[];
}
