/**
 * Upper bound on how much variable substitution may grow a single value, so
 * nested references like `--b: var(--a) var(--a)` can't expand exponentially.
 */
const MAX_SUBSTITUTION_LENGTH = 64 * 1024;

/**
 * How many variables deep a reference chain is followed before giving up, so
 * a long `--b: var(--a); --c: var(--b); ...` chain can't overflow the stack.
 */
const MAX_DEPTH = 100;

/**
 * Resolve a variable's value, with its own var() references already replaced.
 * Each variable is resolved once per top-level replaceVariables() call. A
 * variable that (directly or indirectly) references itself is cyclic and is
 * treated as having no value.
 */
const resolveVariable = (el, name, resolved, depth) => {
  if (resolved.has(name)) return resolved.get(name);
  if (depth > MAX_DEPTH) return;

  resolved.set(name, undefined);
  const value = findVariableValue(el, name);
  const result = value ? replaceVariables(el, value, resolved, depth) : undefined;
  resolved.set(name, result);

  return result;
};

/**
 * Resolve a completed function call, given the text before its '(' and its
 * already-resolved content. Returns the replacement text.
 */
const resolveCall = (el, call, resolved, depth, state) => {
  const literal = `${call.prefix}(${call.content})`;

  if (call.name.toLowerCase() == 'var') {
    const comma = call.comma ?? call.content.length;
    // var(--name , default-value)
    const fallback = call.content.slice(comma + 1).trim();
    // a nested call before the comma can't be part of a variable name
    const varValue = call.callInArg
      ? undefined
      : resolveVariable(el, call.content.slice(0, comma).trim(), resolved, depth + 1);

    // found variable value
    if (varValue && state.length + varValue.length <= MAX_SUBSTITUTION_LENGTH) {
      state.length += varValue.length;
      return varValue;
    }

    // use default value
    if (fallback) return fallback;
  }

  return literal;
};

/**
 * Replace css variables with their value
 *
 * Function calls are resolved from the inside out in a single left-to-right
 * pass: each '(' opens a frame, and its matching ')' resolves the frame's
 * content into its parent. A parenthesised group with no function name (or
 * one containing such a group) is left untouched.
 */
export const replaceVariables = (el, value, resolved = new Map(), depth = 0) => {
  const state = { length: value.length };
  const stack = [{ content: '' }];
  let segment = 0;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char !== '(' && char !== ')' && char !== ',') continue;

    const frame = stack[stack.length - 1];

    // the first top-level comma splits var(--name, default-value)
    if (char === ',') {
      if (frame.comma === undefined) frame.comma = frame.content.length + i - segment;
      continue;
    }

    if (char === '(') {
      // read the function name (letters/hyphens) sitting just before the '('
      let end = i - 1;
      while (end >= segment && /\s/.test(value[end])) end--;
      let start = end;
      while (start >= segment && /[a-z-]/i.test(value[start])) start--;
      start++;

      frame.content += value.slice(segment, start);
      stack.push({
        prefix: value.slice(start, i),
        name: start > end ? '' : value.slice(start, end + 1),
        content: '',
        literal: false
      });
      segment = i + 1;
      continue;
    }

    // unbalanced ')'
    if (stack.length === 1) continue;

    stack.pop();
    frame.content += value.slice(segment, i);
    segment = i + 1;

    const parent = stack[stack.length - 1];
    if (parent.comma === undefined) parent.callInArg = true;
    if (!frame.name || frame.literal) {
      parent.literal = true;
      parent.content += `${frame.prefix}(${frame.content})`;
    } else {
      parent.content += resolveCall(el, frame, resolved, depth, state);
    }
  }

  // close any frames left open by unbalanced '('
  let rest = value.slice(segment);
  for (let i = stack.length - 1; i > 0; i--) {
    rest = `${stack[i].prefix}(${stack[i].content}${rest}`;
  }

  return stack[0].content + rest;
};

export const findVariableValue = (el, variable) => {
  while (el) {
    if (el.styleProps && variable in el.styleProps) {
      return el.styleProps[variable].value;
    }

    el = el.pseudoElementParent || el.parent;
  }
};
