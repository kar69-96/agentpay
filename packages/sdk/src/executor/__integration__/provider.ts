export interface PageHandle {
  goto(url: string): Promise<void>;
  url(): string;
  evaluate<R>(fn: (arg: any) => R, arg?: unknown): Promise<R>;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(): Promise<Buffer>;
}

export interface ActResult {
  success: boolean;
  message: string;
}

export interface CheckoutProvider {
  readonly name: string;
  init(): Promise<void>;
  page(): PageHandle;
  act(
    instruction: string,
    options?: { variables?: Record<string, string> },
  ): Promise<ActResult>;
  extract(instruction: string): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}
