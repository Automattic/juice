const uniqueString = (string) => {
  let str = '';
  do {
    str = (Math.random() + 1).toString(36).substring(2);
  } while (string.indexOf(str) !== -1);

  return str;
};

/**
 * Replace css variables with their value
 */
export const replaceVariables = (el, value) => {

  const replacements = [];
  const uniq = uniqueString(value);
  let funcReg = /([a-z\-]+)\s*\(\s*([^,\(\)]*)\s*(?:,\s*([^,\(\)]*)\s*)?\)/i;
  let match;

  while ((match = funcReg.exec(value)) !== null) {
    const i = `${replacements.length}`;

    if (match[1].toLowerCase() == 'var') {
      const varValue = findVariableValue(el, match[2]);

      if (varValue) {
        value = value.replace(match[0], varValue);
        continue;
      }

      if (match[3]) {
        value = value.replace(match[0], match[3]);
        continue;
      }
    }

    const placeholder = `${uniq}${i.padStart(5, '-')}`;
    value = value.replace(match[0], placeholder);
    replacements.push({ placeholder, replace: match[0] });
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
