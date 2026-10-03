/** Thrown by API services when input is rejected on the client before any request is sent. */
export class ClientValidationError extends Error {
  override readonly name = 'ClientValidationError';
}
