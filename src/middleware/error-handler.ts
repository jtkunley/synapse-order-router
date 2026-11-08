import type { ErrorRequestHandler } from 'express';
import type { RoutingFailure } from '../models/routing.js';

const bodyErrorMessages: Record<string, string> = {
  'entity.parse.failed': 'Request body must contain valid JSON.',
  'entity.too.large': 'Request body is too large.',
  'entity.verify.failed': 'Request body failed verification.',
  'request.aborted': 'Request was aborted before the body could be read.',
  'request.size.invalid': 'Request size did not match Content-Length.',
  'charset.unsupported': 'Unsupported character set.',
  'encoding.unsupported': 'Unsupported content encoding.',
  'parameters.too.many': 'Too many parameters.',
  'stream.encoding.set': 'Unable to read the request body.',
  'stream.not.readable': 'Unable to read the request body.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function httpStatus(error: Record<string, unknown>): number | undefined {
  for (const key of ['status', 'statusCode'] as const) {
    const value = error[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 400 && value < 600) {
      return value;
    }
  }
  return undefined;
}

function describe(error: unknown): { status: number; message: string; log: boolean } {
  if (!isRecord(error)) {
    return { status: 500, message: 'Unable to process the routing request.', log: true };
  }

  if (typeof error.type === 'string' && error.type in bodyErrorMessages) {
    const status = httpStatus(error) ?? 400;
    return {
      status,
      message: bodyErrorMessages[error.type]!,
      log: status >= 500,
    };
  }

  const status = httpStatus(error);
  if (status !== undefined) {
    const exposedMessage =
      error.expose === true && typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : undefined;
    return {
      status,
      message:
        exposedMessage ??
        (status < 500
          ? 'Request could not be processed.'
          : 'Unable to process the routing request.'),
      log: status >= 500,
    };
  }

  return { status: 500, message: 'Unable to process the routing request.', log: true };
}

export const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const { status, message, log } = describe(error);
  if (log) console.error('Routing request failed:', error);

  const failure: RoutingFailure = { feasible: false, errors: [message] };
  response.status(status).json(failure);
};
