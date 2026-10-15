import {env} from '@/lib/runtime';
export const dynamic='force-dynamic';
export async function GET(){try{await env.DB.prepare('SELECT 1 AS ok').first();return Response.json({ok:true})}catch{return Response.json({ok:false},{status:503})}}
