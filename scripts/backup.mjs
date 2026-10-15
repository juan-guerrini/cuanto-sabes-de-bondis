import {backup} from 'node:sqlite';
import {getDatabase} from '../server/database.mjs';
import {resolve} from 'node:path';
const destination=resolve(process.argv[2]||`bondis-backup-${Date.now()}.sqlite`),db=getDatabase();await backup(db.sqlite,destination);db.close();console.log(`Copia creada: ${destination}. Contiene datos privados; no subir a GitHub.`);
