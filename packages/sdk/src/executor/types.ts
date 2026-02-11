export interface CheckoutResult {
  success: boolean;
  confirmationId?: string;
  error?: string;
}

export interface ExecutorConfig {
  browserbaseApiKey?: string;
  browserbaseProjectId?: string;
  modelApiKey?: string;
  proxyUrl?: string;
}
