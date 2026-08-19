export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface ReadyResponse {
  status: string;
  uptime_seconds: number;
  memory_mb: number;
}