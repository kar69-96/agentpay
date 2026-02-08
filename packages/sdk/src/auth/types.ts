export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface PurchaseMandate {
  txId: string;
  txHash: string;
  signature: string;
  publicKey: string;
  timestamp: string;
}

export interface TransactionDetails {
  txId: string;
  merchant: string;
  amount: number;
  description: string;
  timestamp: string;
}
