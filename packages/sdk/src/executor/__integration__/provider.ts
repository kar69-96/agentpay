export interface PageHandle {
  goto(url: string): Promise<void>;
  url(): string;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(): Promise<Buffer>;
}

export interface CheckoutProvider {
  readonly name: string;
  init(): Promise<void>;
  page(): PageHandle;
  /**
   * Run a full task using browser-use Agent.
   * Returns the agent's final result text (or null).
   */
  runTask(task: string, maxSteps?: number): Promise<string | null>;
  close(): Promise<void>;
}
