import type { PurchaseMandate } from '../auth/types.js';

export type TransactionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed';

export interface Transaction {
  id: string;
  status: TransactionStatus;
  merchant: string;
  amount: number;
  description: string;
  url: string;
  createdAt: string;
  mandate?: PurchaseMandate;
  receipt?: Receipt;
  rejectionReason?: string;
  error?: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  amount: number;
  confirmationId: string;
  completedAt: string;
}

export interface ProposeOptions {
  merchant: string;
  amount: number;
  description: string;
  url: string;
}
