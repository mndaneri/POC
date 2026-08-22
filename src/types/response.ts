export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

export interface ReadyResponse {
  status: 'ready';
  uptime_seconds: number;
}

export interface VersionResponse {
  version: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}
