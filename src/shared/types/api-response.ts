/**
 * API Response Types
 * Standard response format for all API endpoints
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiError | null;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  details?: Record<string, string[]>;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
}

/**
 * Create success response
 */
export const createSuccessResponse = <T>(
  data: T,
  message = 'Success'
): ApiResponse<T> => ({
  success: true,
  message,
  data,
  error: null,
});

/**
 * Create error response
 */
export const createErrorResponse = (
  message: string,
  code = 'INTERNAL_ERROR',
  details?: Record<string, string[]>
): ApiResponse<null> => ({
  success: false,
  message,
  data: null,
  error: details ? { code, details } : { code },
});

/**
 * Pagination types
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const createPaginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
