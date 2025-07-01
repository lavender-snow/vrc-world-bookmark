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
