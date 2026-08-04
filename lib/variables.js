const uniqueString = (string) => {
  let str = '';
  do {
    str = (Math.random() + 1).toString(36).substring(2);
  } while (string.indexOf(str) !== -1);

  return str;
};

/**
 * Find the left-most non-nested css function call in `value`.
 * eg: rgb(...), drop-shadow(...), var(--name, default)
 *
 * Non-nested means the parentheses contain no further parentheses, which is
 * what lets callers resolve functions from the inside out. Uses a single
 * linear scan rather than a regex to avoid catastrophic backtracking.
 */
const findFunctionCall = (value) => {
  const opens = [];

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (char === '(') {
      opens.push(i);
      continue;
    }

    if (char !== ')') continue;

    const open = opens.pop();
    if (open === undefined) continue; // unbalanced ')'

    const content = value.slice(open + 1, i);
    // a skipped, name-less inner group can leave parens behind: not innermost
    if (content.indexOf('(') !== -1 || content.indexOf(')') !== -1) continue;

    // read the function name (letters/hyphens) sitting just before the '('
    let end = open - 1;
    while (end >= 0 && /\s/.test(value[end])) end--;
    let start = end;
    while (start >= 0 && /[a-z-]/i.test(value[start])) start--;
    start++;
    if (start > end) continue; // parenthesised group with no function name

    const comma = content.indexOf(',');
    return {
      match: value.slice(start, i + 1),
      name: value.slice(start, end + 1),
      arg: (comma === -1 ? content : content.slice(0, comma)).trim(),
      // var(--name , default-value)
      fallback: comma === -1 ? undefined : content.slice(comma + 1).trim()
    };
  }

  return null;
};

/**
 * Replace css variables with their value
 */
export const replaceVariables = (el, value) => {
  const replacements = [];
  const uniq = uniqueString(value);

  let call;
  while ((call = findFunctionCall(value)) !== null) {
    const i = `${replacements.length}`;

    // attempt to resolve variables
    if (call.name.toLowerCase() == 'var') {
      const varValue = findVariableValue(el, call.arg);

      // found variable value
      if (varValue) {
        value = value.replace(call.match, varValue);
        continue;
      }

      // use default value
      if (call.fallback) {
        value = value.replace(call.match, call.fallback);
        continue;
      }
    }

    const placeholder = `${uniq}${i.padStart(5, '-')}`;
    value = value.replace(call.match, placeholder);
    replacements.push({ placeholder, replace: call.match });
  }

  for (let i = replacements.length - 1; i >= 0; i--) {
    const replacement = replacements[i];
    value = value.replace(replacement.placeholder, replacement.replace);
  }

  return value;
};

export const findVariableValue = (el, variable) => {
  while (el) {
    if (el.styleProps && variable in el.styleProps) {
      return el.styleProps[variable].value;
    }

    el = el.pseudoElementParent || el.parent;
  }
};
