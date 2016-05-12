var juice = require('juice/client');

var input = document.querySelector('#input');
var errMessage = document.querySelector('#err');
var output = document.querySelector('#output');

var render = function ()
{
    input.className = '';
    errMessage.innerHTML = '';

    var options = {};

    Array.prototype.slice.call(document.querySelectorAll('input'), 0)
        .forEach(c => options[c.name] = c.checked);

    try {
        output.value = juice(input.value, options);
    } catch (err) {
        input.className = 'err';
        errMessage.innerHTML = err;
    }
};

input.addEventListener('input', render);
Array.prototype.slice.call(document.querySelectorAll('input[type=checkbox]'), 0)
    .forEach(c => c.addEventListener('change', render));
