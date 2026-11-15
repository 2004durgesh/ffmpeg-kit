export const SessionState = {
  CREATED: 0,
  RUNNING: 1,
  FAILED: 2,
  COMPLETED: 3,
} as const;
export type SessionState = (typeof SessionState)[keyof typeof SessionState];

export function sessionStateToString(state: number): string {
  switch (state) {
    case SessionState.CREATED:
      return 'CREATED';
    case SessionState.RUNNING:
      return 'RUNNING';
    case SessionState.FAILED:
      return 'FAILED';
    case SessionState.COMPLETED:
      return 'COMPLETED';
    default:
      return '';
  }
}
