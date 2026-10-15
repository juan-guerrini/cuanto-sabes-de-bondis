// The portable deployment never trusts identity headers supplied by visitors.
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export async function getChatGPTUser():Promise<ChatGPTUser|null>{return null;}
export function chatGPTSignInPath(_returnTo:string){return '/cuenta';}
export function chatGPTSignOutPath(_returnTo='/'){return '/cuenta';}
