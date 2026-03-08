// ─── Source Types ────────────────────────────────────────────────

export interface Source {
  id: string;
  name: string;
  baseUrl: string;
  scraperKey: string;
  enabled: boolean;
  lastScrapedAt?: string;
  jobCount: number;
  createdAt: string;
}

export interface SourceCreateInput {
  name: string;
  baseUrl: string;
  scraperKey: string;
  enabled?: boolean;
}
