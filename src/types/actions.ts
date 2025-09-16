export interface GameAction {
  action: string;
  parameters?: Record<string, unknown>;
}

export interface ActionResponse {
  status: 'success' | 'failed';
  message?: string;
  data?: unknown;
}
