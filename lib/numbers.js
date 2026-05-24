/**
 * Converts a decimal number to roman numeral.
 * https://stackoverflow.com/questions/9083037/convert-a-number-into-a-roman-numeral-in-javascript
 *
 * @param {Number} number
 * @api private.
 */
export function romanize(num) {
    if (isNaN(num))
        return NaN;
    const digits = String(+num).split("");
    const key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
                 "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
                 "","I","II","III","IV","V","VI","VII","VIII","IX"];
    let roman = "";
    let i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}

/**
 * Converts a decimal number to alphanumeric numeral.
 * https://stackoverflow.com/questions/45787459/convert-number-to-alphabet-string-javascript
 *
 * @param {Number} number
 * @api private.
 */
export function alphanumeric(num) {
    let s = '';
    let t;

    while (num > 0) {
      t = (num - 1) % 26;
      s = String.fromCharCode(65 + t) + s;
      num = (num - t)/26 | 0;
    }
    return s || undefined;
}
