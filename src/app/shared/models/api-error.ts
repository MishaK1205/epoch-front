export interface ApiError {
  statusCode: number;
  /** Validation errors (400) return an array of messages. */
  message: string | string[];
  /** e.g. 'Bad Request', 'Unauthorized', 'Conflict'. */
  error: string;
}
