import * as requireDir from 'require-dir';
import { basename } from 'path';

const filter = (fullPath) => basename(fullPath) !== __filename;
export const migrationsUp = {}

for (const [name, module] of Object.entries(requireDir('.', { filter, recurse: true }))) {
    if (module.up) {
        migrationsUp[name] = module.up;
    }
}
