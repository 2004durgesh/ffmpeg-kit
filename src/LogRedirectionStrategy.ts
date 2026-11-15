export const LogRedirectionStrategy = {
  ALWAYS_PRINT_LOGS: 0,
  PRINT_LOGS_WHEN_NO_CALLBACKS_DEFINED: 1,
  PRINT_LOGS_WHEN_GLOBAL_CALLBACK_NOT_DEFINED: 2,
  PRINT_LOGS_WHEN_SESSION_CALLBACK_NOT_DEFINED: 3,
  NEVER_PRINT_LOGS: 4,
} as const;
export type LogRedirectionStrategy =
  (typeof LogRedirectionStrategy)[keyof typeof LogRedirectionStrategy];
