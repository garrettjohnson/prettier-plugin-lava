const fs = require('fs');
const path = require('path');

const grammarPath = path.join(__dirname, '../grammar');

fs.writeFileSync(
  path.join(grammarPath, 'lava-html.ohm.js'),
  'module.exports = ' +
    'String.raw`' +
    fs
      .readFileSync(path.join(grammarPath, 'lava-html.ohm'), 'utf8')
      .replace(/`/g, '${"`"}') +
    '`;',
  'utf8',
);
