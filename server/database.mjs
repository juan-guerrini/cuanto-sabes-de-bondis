import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
let adapter;
export function migrate(db,directory=resolve(process.cwd(),'drizzle')){
 db.exec('CREATE TABLE IF NOT EXISTS __portable_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL)');
 for(const name of readdirSync(directory).filter(f=>f.endsWith('.sql')).sort()){
 const sql=readFileSync(join(directory,name),'utf8'),hash=createHash('sha256').update(sql).digest('hex'),old=db.prepare('SELECT hash FROM __portable_migrations WHERE name=?').get(name);
 if(old){if(old.hash!==hash)throw Error(`La migración aplicada ${name} fue modificada.`);continue;}
 db.exec('BEGIN IMMEDIATE');try{db.exec(sql);db.prepare('INSERT INTO __portable_migrations(name,hash) VALUES (?,?)').run(name,hash);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
}
export function openDatabase(filename,directory){
 if(filename!==':memory:')mkdirSync(dirname(resolve(filename)),{recursive:true});
 const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');migrate(sqlite,directory);
 function prepare(sql){let values=[];return {bind(...args){values=args;return this},async first(column){const row=sqlite.prepare(sql).get(...values);return row?(column?row[column]:row):null},async all(){return {success:true,results:sqlite.prepare(sql).all(...values)}},async run(){return execute()},execute};function execute(){const st=sqlite.prepare(sql),rows=st.columns().length?st.all(...values):(st.run(...values),null),changes=Number(sqlite.prepare('SELECT changes() AS n').get().n);return {success:true,results:rows||[],meta:{changes}};}}
 return {prepare,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>s.execute());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close(){sqlite.close()},sqlite};
}
export function getDatabase(){if(!adapter)adapter=openDatabase(process.env.DATABASE_PATH||resolve('data/bondis.sqlite'));return adapter;}
