export type SpeciesType = 'ga' | 'heo';
export type ZoneType = 'xanh' | 'vang' | 'do';
export type BioZone = 'RED' | 'YELLOW' | 'GREEN' | 'RED_YELLOW' | 'GENERAL';

export interface SopKeyMetric {
  label: string;
  value: string;
  unit: string;
}

export interface SopDocument {
  id: string;
  species: SpeciesType;
  title: string;
  area: string;
  zone_type: ZoneType;
  disinfect_min: number | null;
  dilution: string | null;
  content: string;
  warning: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Optional compatibility fields
  zone?: BioZone;
  zoneLabel?: string;
  active?: boolean;
  updatedAt?: string;
}

export interface ChatResponsePayload {
  matchedSopId: string;
  source_ids?: string[];
  sourceSopTitle?: string;
  sourceZone?: string;
  isOutOfScope: boolean;
  zone: BioZone;
  zoneLabel: string;
  summaryTitle: string;
  stepsMarkdown: string;
  criticalWarning: string;
  keyMetrics: SopKeyMetric[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  question?: string;
  payload?: ChatResponsePayload;
  matchedSop?: SopDocument;
  sourceSops?: SopDocument[];
  isError?: boolean;
  errorText?: string;
}

export interface ToastNotice {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}
