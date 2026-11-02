import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {importMemOSExport} from '../memos-export.mjs';
const source=process.argv[2];if(!source)throw Error('Usage: node scripts/import-memos.mjs export.json');
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
console.log(await importMemOSExport(path.join(root,'data'),path.resolve(source)));
