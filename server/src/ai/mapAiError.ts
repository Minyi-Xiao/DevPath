import { DocumentErrorCode, documentErrorMessages } from '../lib/documentLimits';
import { HttpError } from '../lib/httpError';

export function notConfiguredError() {
  return new HttpError(
    503,
    documentErrorMessages.ANALYSIS_NOT_CONFIGURED,
    DocumentErrorCode.ANALYSIS_NOT_CONFIGURED,
  );
}

export function unavailableError() {
  return new HttpError(
    503,
    documentErrorMessages.ANALYSIS_UNAVAILABLE,
    DocumentErrorCode.ANALYSIS_UNAVAILABLE,
  );
}

export function invalidAiOutputError() {
  return new HttpError(
    502,
    documentErrorMessages.INVALID_AI_OUTPUT,
    DocumentErrorCode.INVALID_AI_OUTPUT,
  );
}

export function analysisTimeoutError() {
  return new HttpError(
    504,
    documentErrorMessages.ANALYSIS_TIMEOUT,
    DocumentErrorCode.ANALYSIS_TIMEOUT,
  );
}

export function mapOpenAiHttpStatus(status: number) {
  if (status === 401 || status === 403) {
    return notConfiguredError();
  }

  if (status === 408 || status === 504) {
    return analysisTimeoutError();
  }

  if (status === 429 || status >= 500) {
    return unavailableError();
  }

  return invalidAiOutputError();
}

export function mapProviderError(error: unknown) {
  if (error instanceof HttpError) {
    return error;
  }

  if (isAbortError(error) || hasName(error, 'TimeoutError', 'ModelTimeoutException')) {
    return analysisTimeoutError();
  }

  if (
    hasName(
      error,
      'CredentialsProviderError',
      'UnrecognizedClientException',
      'InvalidSignatureException',
    )
  ) {
    return notConfiguredError();
  }

  if (
    hasName(
      error,
      'AccessDeniedException',
      'UnauthorizedException',
      'UnrecognizedClientException',
      'ResourceNotFoundException',
      'ServiceUnavailableException',
      'ThrottlingException',
      'Throttling',
    )
  ) {
    return unavailableError();
  }

  return invalidAiOutputError();
}

export function providerErrorName(error: unknown) {
  if (error instanceof Error && error.name) {
    return error.name;
  }

  return 'UnknownError';
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function hasName(error: unknown, ...names: string[]) {
  if (!(error instanceof Error)) {
    return false;
  }

  return names.includes(error.name) || names.some((name) => error.constructor.name === name);
}