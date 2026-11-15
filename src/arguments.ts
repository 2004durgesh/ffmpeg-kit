/**
 * Splits a command into arguments. Single or double quotes group words and
 * are stripped; a quote preceded by a backslash is kept as a literal.
 */
export function parseArguments(command: string): string[] {
  const argumentList: string[] = [];
  let currentArgument = '';
  let singleQuoteStarted = false;
  let doubleQuoteStarted = false;

  for (let i = 0; i < command.length; i++) {
    const previousChar = i > 0 ? command.charAt(i - 1) : null;
    const currentChar = command.charAt(i);

    if (currentChar === ' ') {
      if (singleQuoteStarted || doubleQuoteStarted) {
        currentArgument += currentChar;
      } else if (currentArgument.length > 0) {
        argumentList.push(currentArgument);
        currentArgument = '';
      }
    } else if (currentChar === "'" && previousChar !== '\\') {
      if (singleQuoteStarted) {
        singleQuoteStarted = false;
      } else if (doubleQuoteStarted) {
        currentArgument += currentChar;
      } else {
        singleQuoteStarted = true;
      }
    } else if (currentChar === '"' && previousChar !== '\\') {
      if (doubleQuoteStarted) {
        doubleQuoteStarted = false;
      } else if (singleQuoteStarted) {
        currentArgument += currentChar;
      } else {
        doubleQuoteStarted = true;
      }
    } else {
      currentArgument += currentChar;
    }
  }

  if (currentArgument.length > 0) {
    argumentList.push(currentArgument);
  }
  return argumentList;
}

export function argumentsToString(
  commandArguments: string[] | undefined
): string {
  if (commandArguments === undefined) {
    return 'undefined';
  }
  return commandArguments.join(' ');
}
