import type { ErrorRequestHandler } from 'express';
import { getFailureResponse } from '../models/routing.js';

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

function describe(error: unknown): { message: string; log: boolean } {
  if (isRecord(error) && typeof error.type === 'string' && error.type in bodyErrorMessages) {
    return { message: bodyErrorMessages[error.type]!, log: false };
  }

  if (
    isRecord(error) &&
    error.expose === true &&
    typeof error.message === 'string' &&
    error.message.length > 0
  ) {
    return { message: error.message, log: false };
  }

  return { message: 'Unable to process the routing request.', log: true };
}

export const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const { message, log } = describe(error);
  if (log) console.error('Routing request failed:', error);

  response.status(200).json(getFailureResponse([message]));
};
