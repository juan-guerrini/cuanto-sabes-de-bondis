import {getDatabase} from '../server/database.mjs';
type Result={success:boolean;results:any[];meta?:{changes:number}};
interface Statement{bind(...values:any[]):Statement;first<T=Record<string,any>>(column?:string):Promise<T|null>;all<T=Record<string,any>>():Promise<{success:boolean;results:T[]}>;run():Promise<Result>}
interface Database{prepare(sql:string):Statement;batch(statements:Statement[]):Promise<Result[]>}
export const env={get DB():Database{return getDatabase() as unknown as Database},get ADMIN_KEY(){return process.env.ADMIN_KEY},get OWNER_EMAIL(){return process.env.OWNER_EMAIL}};
