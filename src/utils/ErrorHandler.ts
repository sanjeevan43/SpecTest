/**
 * @file ErrorHandler.ts
 * @description Global error boundary utilities and user-facing error normalization.
 *
 * Responsibilities:
 * - Convert any thrown value into a consistent `AppError` shape
 * - Classify errors by category (network, validation, storage, runtime, unknown)
 * - Provide user-friendly messages mapped from technical errors
 * - Integrate with Logger for structured error emission
 * - Provide a React error boundary component for UI sections
 */

import React from 'react';
import { createLogger } from './Logger';

const log = createLogger('service');

// ---------------------------------------------------------------------------
// Error Model
// ---------------------------------------------------------------------------

export type ErrorCategory =
  | 'network'
  | 'validation'
  | 'storage'
  | 'parsing'
  | 'authentication'
  | 'runtime'
  | 'unknown';

export interface AppError {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  originalError?: unknown;
  retryable: boolean;
}

// ---------------------------------------------------------------------------
// Error Normalizer
// ---------------------------------------------------------------------------

const NETWORK_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'net::err',
  'timeout',
  'aborted',
  'cors',
];

const AUTH_PATTERNS = ['401', 'unauthorized', '403', 'forbidden', 'token', 'jwt'];
const PARSING_PATTERNS = ['malformed', 'invalid json', 'yaml', 'parse error', 'unexpected token'];
const STORAGE_PATTERNS = ['quota', 'storage', 'indexeddb', 'chrome.storage'];
const VALIDATION_PATTERNS = ['schema', 'required', 'type mismatch', 'additional properties'];

function classifyError(message: string): ErrorCategory {
  const lower = message.toLowerCase();
  if (NETWORK_PATTERNS.some((p) => lower.includes(p))) return 'network';
  if (AUTH_PATTERNS.some((p) => lower.includes(p))) return 'authentication';
  if (PARSING_PATTERNS.some((p) => lower.includes(p))) return 'parsing';
  if (STORAGE_PATTERNS.some((p) => lower.includes(p))) return 'storage';
  if (VALIDATION_PATTERNS.some((p) => lower.includes(p))) return 'validation';
  return 'runtime';
}

const USER_MESSAGES: Record<ErrorCategory, string> = {
  network: 'Network request failed. Check that the API server is reachable and CORS is configured.',
  validation: 'The API response does not match the OpenAPI specification.',
  storage: 'Could not save data. Chrome storage may be full.',
  parsing: 'The OpenAPI specification could not be parsed. Ensure the URL points to valid JSON or YAML.',
  authentication: 'Authentication failed. Please check your credentials in the Auth & Envs tab.',
  runtime: 'An unexpected error occurred.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Normalizes any thrown value into a structured `AppError`.
 */
export function normalizeError(err: unknown, context?: string): AppError {
  if (err instanceof Error) {
    const category = classifyError(err.message);
    const appError: AppError = {
      category,
      message: err.message,
      userMessage: USER_MESSAGES[category],
      originalError: err,
      retryable: category === 'network',
    };
    log.error(`[${context ?? 'unknown'}] ${err.message}`, { stack: err.stack });
    return appError;
  }

  const message = String(err);
  const category = classifyError(message);
  return {
    category,
    message,
    userMessage: USER_MESSAGES[category],
    originalError: err,
    retryable: false,
  };
}

/**
 * Wraps an async operation with normalized error handling.
 * Returns `{ data, error }` – never throws.
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: string,
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: normalizeError(err, context) };
  }
}

// ---------------------------------------------------------------------------
// React Error Boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    return { hasError: true, error: normalizeError(err, 'react-boundary') };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo): void {
    log.error('React component crashed', { message: err.message, componentStack: info.componentStack });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return React.createElement(ErrorFallback, {
        error: this.state.error,
        onRetry: this.handleRetry,
      });
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Fallback UI (pure inline styles, no Tailwind dependency here)
// ---------------------------------------------------------------------------

interface ErrorFallbackProps {
  error: AppError | null;
  onRetry?: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps): React.ReactElement {
  return React.createElement(
    'div',
    {
      style: {
        padding: '16px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '8px',
        color: '#f87171',
        fontFamily: 'monospace',
        fontSize: '11px',
      },
    },
    React.createElement('div', { style: { fontWeight: 'bold', marginBottom: '6px' } }, '⚠ Component Error'),
    React.createElement('p', { style: { color: '#fca5a5', marginBottom: '8px' } }, error?.userMessage ?? 'An unexpected error occurred.'),
    error?.message && React.createElement('pre', { style: { fontSize: '9px', color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, error.message),
    onRetry &&
      React.createElement(
        'button',
        {
          onClick: onRetry,
          style: {
            marginTop: '8px',
            padding: '4px 10px',
            background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '4px',
            color: '#fca5a5',
            cursor: 'pointer',
            fontSize: '10px',
          },
        },
        'Retry',
      ),
  );
}
