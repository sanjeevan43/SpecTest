export type ValidationErrorType =
  | 'type_mismatch'
  | 'missing_property'
  | 'unexpected_property'
  | 'enum_violation'
  | 'value_out_of_bounds'
  | 'format_violation'
  | 'header_mismatch'
  | 'status_mismatch'
  | 'content_type_mismatch';

export interface ValidationError {
  path: string; // e.g. "body.email" or "headers.content-type"
  errorType: ValidationErrorType;
  expected: string;
  actual: string;
  message: string;
  suggestion: string;
  isWarning?: boolean;
}
