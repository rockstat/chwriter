const requireDir = require('require-dir');
const { basename } = require('path');

const filter = (fullPath) => basename(fullPath) !== __filename;
const migrationsUp = {}

for (const [name, module] of Object.entries(requireDir('.', { filter, recurse: true }))) {
    if (module.up) {
        migrationsUp[name] = module.up;
    }
}

module.exports.migrationsUp = migrationsUp;