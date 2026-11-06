export type BioZone = 'RED' | 'YELLOW' | 'GREEN' | 'RED_YELLOW' | 'GENERAL';

export interface SopKeyMetric {
  label: string;
  value: string;
  unit: string;
}

export interface SopDocument {
  id: string;
  code: string;
  title: string;
  zone: BioZone;
  zoneLabel: string;
  tags: string[];
  imageUrl: string;
  summary: string;
  content: string;
  criticalWarning: string;
  keyMetrics: SopKeyMetric[];
  active: boolean;
  updatedAt: string;
}

export interface DefenseLineCard {
  id: 'LINE_1' | 'LINE_2' | 'LINE_3';
  zone: 'RED' | 'YELLOW' | 'GREEN';
  lineNumber: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  keyControlPoints: string[];
  quickPrompts: string[];
}

export interface ChatResponsePayload {
  matchedSopId: string;
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
  isError?: boolean;
  errorText?: string;
}

export interface PresetBioImage {
  id: string;
  title: string;
  zone: BioZone;
  url: string;
  caption: string;
}

export interface ToastNotice {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}
