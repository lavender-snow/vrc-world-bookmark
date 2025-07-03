export class LLMResponseValidationError  extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMResponseValidationError ';
  }
}

export class ToolInvocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInvocationError';
  }
}

export class InvalidParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidParameterError';
  }
}

export class LLMApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMApiError';
  }
}
