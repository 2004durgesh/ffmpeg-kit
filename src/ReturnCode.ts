export class ReturnCode {
  static readonly SUCCESS = 0;
  static readonly CANCEL = 255;

  #value: number;

  constructor(value: number) {
    this.#value = value;
  }

  static isSuccess(returnCode: ReturnCode | undefined): boolean {
    return (
      returnCode !== undefined && returnCode.getValue() === ReturnCode.SUCCESS
    );
  }

  static isCancel(returnCode: ReturnCode | undefined): boolean {
    return (
      returnCode !== undefined && returnCode.getValue() === ReturnCode.CANCEL
    );
  }

  getValue(): number {
    return this.#value;
  }
  isValueSuccess(): boolean {
    return this.#value === ReturnCode.SUCCESS;
  }
  isValueError(): boolean {
    return (
      this.#value !== ReturnCode.SUCCESS && this.#value !== ReturnCode.CANCEL
    );
  }
  isValueCancel(): boolean {
    return this.#value === ReturnCode.CANCEL;
  }
  toString(): string {
    return String(this.#value);
  }
}
