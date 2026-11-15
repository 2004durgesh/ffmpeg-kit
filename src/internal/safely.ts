/** Runs user code; an exception is logged instead of breaking delivery. */
export function safely(what: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.log(`Exception thrown inside ${what}.`, (err as Error)?.stack);
  }
}
