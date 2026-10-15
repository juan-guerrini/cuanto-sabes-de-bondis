import {getDatabase} from '../server/database.mjs';
getDatabase().close();console.log('Base de datos y migraciones preparadas.');
