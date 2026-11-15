export const Signal = {
  SIGINT: 2,
  SIGQUIT: 3,
  SIGPIPE: 13,
  SIGTERM: 15,
  SIGXCPU: 24,
} as const;
export type Signal = (typeof Signal)[keyof typeof Signal];
