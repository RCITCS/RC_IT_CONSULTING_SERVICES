const enc=new TextEncoder();
const BOOTSTRAP_SALT="mwK4QisUlk0eT2-ibdRb-A";
const BOOTSTRAP_DERIVED="wliHoXtQ9dYOaLEAj_qEDUXjLBwJ4xLjmclQagvAcs4";
function b64(bytes:Uint8Array){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
function unb64(value:string){const padded=value.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((value.length+3)%4);const binary=atob(padded);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
function same(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;}
export async function shaHex(v:string){const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(v)));return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
export async function verifyBootstrapPassword(password:string){const salt=unb64(BOOTSTRAP_SALT);const expected=unb64(BOOTSTRAP_DERIVED);const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const actual=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:600000},key,expected.length*8));return same(actual,expected);}
export function randomToken(){return b64(crypto.getRandomValues(new Uint8Array(32)));}
