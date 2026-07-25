export interface StoredEntity {
  name: string;      // e.g. "studentId", "id"
  value: string;     // resolved/extracted value
  source: string;    // endpoint that returned it, e.g. "POST /students"
  timestamp: number;
}
