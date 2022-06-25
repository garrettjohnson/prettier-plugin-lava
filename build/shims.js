const fs = require('fs');
const path = require('path');

fs.writeFileSync(
  path.join(__dirname, 'shims/lava-html-ohm.js'),
  'module.exports = ' +
    'String.raw`' +
    require('../grammar/lava-html.ohm.js').replace(/`/g, '${"`"}') +
    '`;',
  'utf8',
);
