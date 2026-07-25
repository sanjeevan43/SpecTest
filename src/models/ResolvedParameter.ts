export interface ResolvedParameter {
  name: string;
  value: string;
  source: 'cache' | 'collection' | 'user' | 'generated' | 'missing';
  sourceDetails?: string; // e.g. "POST /students" or "GET /students"
}
