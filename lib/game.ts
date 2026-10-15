export type Country={id:string;name:string;flag:string;points:number;status?:"active"|"comingSoon"};
export type Question={id:string;country:string;prompt:string;options:string[];correct:number;difficulty:string;category:string;explanation:string;active:number;authorName?:string;authorEmail?:string};
export const countries:Country[]=[
{id:'ar',name:'Argentina',flag:'🇦🇷',points:0},{id:'uy',name:'Uruguay',flag:'🇺🇾',points:500},{id:'br',name:'Brasil',flag:'🇧🇷',points:1000},{id:'cl',name:'Chile',flag:'🇨🇱',points:1500},{id:'es',name:'España',flag:'🇪🇸',points:2000},{id:'gb',name:'Reino Unido',flag:'🇬🇧',points:2500},{id:'de',name:'Alemania',flag:'🇩🇪',points:3000},{id:'jp',name:'Japón',flag:'🇯🇵',points:3500},{id:'us',name:'Estados Unidos',flag:'🇺🇸',points:4000}];
export function validateQuestion(q:any,cs:Country[]):Question {
 if(!cs.some(c=>c.id===q.country)||typeof q.prompt!=='string'||!q.prompt.trim()||q.prompt.length>600||!Array.isArray(q.options)||q.options.length!==4||q.options.some((o:any)=>typeof o!=='string'||!o.trim()||o.length>300)||new Set(q.options.map((o:string)=>o.trim().toLowerCase())).size!==4||!Number.isInteger(q.correct)||q.correct<0||q.correct>3||!['Fácil','Media','Difícil'].includes(q.difficulty))throw new Error('Completá la pregunta, cuatro respuestas diferentes y marcá la correcta.');
 return {id:typeof q.id==='string'&&q.id.length<80?q.id:crypto.randomUUID(),country:q.country,prompt:q.prompt.trim(),options:q.options.map((o:string)=>o.trim()),correct:q.correct,difficulty:q.difficulty,category:String(q.category||'General').trim().slice(0,80)||'General',explanation:String(q.explanation||'').slice(0,1500),active:q.active===0?0:1};
}

export function unansweredQuestions<T extends {id:string;country:string}>(questions:T[],countryId:string,seen:string[]):T[]{const answered=new Set(seen);return questions.filter(q=>q.country===countryId&&!answered.has(q.id));}
