import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminByEmail, adminById, audit, changePassword, consumeResetToken, failedCount, queueResetRequest, resetByHash, resetRequestCount, revokeSession, saveNewPassword, sessionByHash, touchSession, updateLastLogin, verifyPassword, createSession } from "./db.ts";
import { randomToken, shaHex, verifyBootstrapPassword } from "./crypto.js";

const ADMIN_EMAIL = "rcitcservices@gmail.com";
const SESSION_TTL = 8 * 60 * 60;
const IDLE_TTL = 30 * 60;
const RECOVERY_TTL = 10 * 60;
const BOOTSTRAP_VERIFIER = Deno.env.get("ADMIN_BOOTSTRAP_PASSWORD_VERIFIER") ?? "";

function base(url: URL): string { return url.hostname.endsWith(".supabase.co") ? "/functions/v1/admin-auth" : ""; }
function route(url: URL): string {
  let p = url.pathname || "/";
  for (const prefix of ["/functions/v1/admin-auth", "/admin-auth"]) {
    if (p === prefix) return "/";
    if (p.startsWith(prefix + "/")) { p = p.slice(prefix.length); break; }
  }
  return p || "/";
}
function parseCookies(req: Request): Record<string,string> {
  const out: Record<string,string> = {};
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0,i).trim()] = decodeURIComponent(part.slice(i+1).trim());
  }
  return out;
}
function headers(type="text/html; charset=utf-8"): Headers {
  return new Headers({
    "content-type": type,
    "cache-control": "no-store, max-age=0, must-revalidate",
    "pragma": "no-cache",
    "expires": "0",
    "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "x-permitted-cross-domain-policies": "none"
  });
}
function esc(v: unknown): string { return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] ?? c)); }
function shell(title:string, body:string, status=200, extra?:Headers):Response {
  const h=headers(); if(extra) extra.forEach((v,k)=>h.append(k,v));
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${esc(title)} | RC IT Services Admin</title><style>
*{box-sizing:border-box}html{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#f5f7fa;color:#101828}body{margin:0;min-height:100vh}.auth{min-height:100vh;display:grid;place-items:center;padding:24px}.auth-card{width:min(100%,480px);background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:32px;box-shadow:0 14px 38px rgba(16,24,40,.08)}.brand{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#175cd3;margin-bottom:22px}h1{font-size:26px;margin:0 0 8px}p{color:#475467;line-height:1.55}.field{margin:18px 0}.field label{display:block;font-size:14px;font-weight:650;margin-bottom:7px}.field input{width:100%;border:1px solid #d0d5dd;border-radius:9px;padding:11px 12px;font:inherit}.btn{display:inline-block;border:0;border-radius:9px;background:#175cd3;color:#fff;padding:11px 16px;font:inherit;font-weight:750;text-decoration:none;cursor:pointer}.secondary{background:#fff;color:#344054;border:1px solid #d0d5dd}.link{color:#175cd3;font-weight:650;text-decoration:none}.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:22px}.msg{border-radius:9px;padding:11px 12px;margin:16px 0;font-size:14px}.error{background:#fef3f2;color:#b42318}.ok{background:#ecfdf3;color:#067647}.muted{font-size:13px;color:#667085}.row{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #eaecf0;padding:12px 0}.row span{color:#667085}
.session-card{margin-top:22px}.session-card .row strong{text-align:right;overflow-wrap:anywhere}
</style></head><body>${body}</body></html>`;
  return new Response(html,{status,headers:h});
}
function authPage(title:string,body:string,status=200,extra?:Headers){return shell(title,`<main class="auth"><section class="auth-card"><div class="brand">RC IT Services · Administration</div>${body}</section></main>`,status,extra);}
function json(data:unknown,status=200):Response{return new Response(JSON.stringify(data),{status,headers:headers("application/json; charset=utf-8")});}
function loginPage(url:URL,message="",error=false):Response{
  const b=base(url); const notice=message?`<div class="msg ${error?"error":"ok"}">${esc(message)}</div>`:"";
  return authPage("Sign in",`<h1>Administrator sign in</h1><p>Authorised RC IT Services administration access only.</p>${notice}<form method="post" action="${b}/login"><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" maxlength="254" required></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required></div><button class="btn" type="submit">Sign in</button></form><p><a class="link" href="${b}/forgot-password">Forgot password?</a></p><p class="muted">Private administration surface. Search indexing and caching are disabled.</p>`);
}
function forgotPage(url:URL,accepted=false):Response{
  const b=base(url);
  return authPage("Forgot password",`<h1>Forgot password</h1>${accepted?`<div class="msg ok">If the account is eligible, the reset request has been accepted.</div>`:`<p>Enter the administrator email address. The response will not disclose whether an account exists.</p>`}<form method="post" action="${b}/forgot-password"><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required></div><div class="actions"><button class="btn" type="submit">Request reset</button><a class="btn secondary" href="${b || "/"}">Back to sign in</a></div></form><p class="muted">Transactional reset delivery is connected in Phase 13.</p>`);
}
function authCookies(url:URL,session="",csrf="",maxAge=SESSION_TTL):Headers{
  const h=new Headers(); const path=base(url)||"/";
  h.append("set-cookie",`rcitcs_admin_session=${encodeURIComponent(session)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`);
  h.append("set-cookie",`rcitcs_admin_csrf=${encodeURIComponent(csrf)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`); return h;
}
function recoveryCookies(url:URL,token="",csrf="",maxAge=RECOVERY_TTL):Headers{
  const h=new Headers(); const path=`${base(url)}/reset-password`||"/reset-password";
  h.append("set-cookie",`rcitcs_admin_recovery=${encodeURIComponent(token)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`);
  h.append("set-cookie",`rcitcs_admin_recovery_csrf=${encodeURIComponent(csrf)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High`); return h;
}
function originOk(req:Request,url:URL):boolean{const o=req.headers.get("origin");return !!o&&(o===`${url.protocol}//${url.host}`||o==="https://admin.rcitcs.com");}
async function ipHash(req:Request):Promise<string>{const ip=(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();return shaHex(ip);}
function strong(v:string):boolean{return v.length>=12&&v.length<=256&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/[0-9]/.test(v)&&/[^A-Za-z0-9]/.test(v);}
async function session(req:Request):Promise<any|null>{
  const c=parseCookies(req); if(!c.rcitcs_admin_session)return null;
  const row=await sessionByHash(await shaHex(c.rcitcs_admin_session),new Date(Date.now()-IDLE_TTL*1000).toISOString()); if(!row)return null;
  const admin=await adminById(row.admin_id); if(!admin)return null;
  if(!row.last_seen_at||Date.now()-Date.parse(row.last_seen_at)>5*60_000)await touchSession(row.id);
  return {...row,admin,csrf:c.rcitcs_admin_csrf??""};
}
async function csrfOk(s:any,submitted:string):Promise<boolean>{return !!submitted&&submitted===s.csrf&&await shaHex(submitted)===s.csrf_token_hash;}
async function recovery(req:Request):Promise<any|null>{const c=parseCookies(req);if(!c.rcitcs_admin_recovery)return null;const r=await resetByHash(await shaHex(c.rcitcs_admin_recovery));if(!r)return null;const admin=await adminById(r.admin_id);if(!admin)return null;return {reset:r,admin,csrf:c.rcitcs_admin_recovery_csrf??"",token:c.rcitcs_admin_recovery};}
function accountPage(url:URL,s:any):Response{
  const b=base(url);
  return authPage("Authenticated",`<h1>Secure administration access</h1><div class="msg ok">You are signed in.</div><div class="session-card"><div class="row"><span>Account</span><strong>${esc(s.admin.email)}</strong></div><div class="row"><span>Role</span><strong>${esc(s.admin.role)}</strong></div><div class="row"><span>Session expires</span><strong>${esc(s.expires_at)}</strong></div></div><div class="actions"><a class="btn secondary" href="${b}/change-password">Change password</a><form method="post" action="${b}/logout"><input type="hidden" name="csrf" value="${esc(s.csrf)}"><button class="btn" type="submit">Sign out</button></form></div><p class="muted">Operational dashboard modules are intentionally outside Phase 9.</p>`);
}

Deno.serve(async(req:Request)=>{
  const url=new URL(req.url); const path=route(url); const ua=(req.headers.get("user-agent")??"").slice(0,500); const clientHash=await ipHash(req);
  try{
    if(req.method==="GET"&&path==="/health")return json({ok:true,service:"rcitcs-admin",phase:9});
    if(!["GET","POST"].includes(req.method)){const h=headers();h.set("allow","GET, POST");return new Response("Method Not Allowed",{status:405,headers:h});}
    if(req.method==="POST"&&!originOk(req,url))return authPage("Request rejected","<h1>Request rejected</h1><p>Reload the administration page and try again.</p>",403);
    if(req.method==="POST"&&Number(req.headers.get("content-length")||"0")>32768)return authPage("Request rejected","<h1>Request too large</h1>",413);

    if(req.method==="POST"&&path==="/login"){
      if(await failedCount(clientHash)>=5){const h=new Headers();h.set("retry-after","900");return authPage("Sign in limited","<h1>Too many sign-in attempts</h1><div class=\"msg error\">Try again later.</div>",429,h);}
      const f=await req.formData(); const email=String(f.get("email")??"").trim().toLowerCase(); const password=String(f.get("password")??"");
      const admin=email===ADMIN_EMAIL?await adminByEmail(email):null; let accepted=false;
      if(admin&&password.length>0&&password.length<=256){if(admin.password_hash){accepted=await verifyPassword(admin.id,password);}else if(BOOTSTRAP_VERIFIER&&await verifyBootstrapPassword(password,BOOTSTRAP_VERIFIER)){accepted=await saveNewPassword(admin.id,password);if(accepted)await audit("admin_bootstrap_password_activated",admin.id,clientHash,ua,{});}}
      if(!accepted||!admin){await audit("admin_login_failed",null,clientHash,ua,{});return loginPage(url,"Invalid email or password.",true);}
      const rawSession=randomToken(); const rawCsrf=randomToken();
      await createSession({admin_id:admin.id,token_hash:await shaHex(rawSession),csrf_token_hash:await shaHex(rawCsrf),ip_hash:clientHash,user_agent:ua,expires_at:new Date(Date.now()+SESSION_TTL*1000).toISOString(),last_seen_at:new Date().toISOString()});
      await updateLastLogin(admin.id); await audit("admin_login_success",admin.id,clientHash,ua,{});
      const h=authCookies(url,rawSession,rawCsrf);h.set("location",base(url)||"/");return new Response(null,{status:303,headers:h});
    }

    if(req.method==="GET"&&path==="/forgot-password")return forgotPage(url);
    if(req.method==="POST"&&path==="/forgot-password"){
      if(await resetRequestCount(clientHash)<3){const f=await req.formData();const email=String(f.get("email")??"").trim().toLowerCase();if(email===ADMIN_EMAIL){const admin=await adminByEmail(email);if(admin){await queueResetRequest(admin.id,admin.email);await audit("admin_password_reset_requested",admin.id,clientHash,ua,{delivery:"phase_13_queue"});}}}
      return forgotPage(url,true);
    }

    if(req.method==="GET"&&path==="/reset-password"&&url.searchParams.get("token")){
      const raw=String(url.searchParams.get("token")??""); const reset=raw.length>=32&&raw.length<=256?await resetByHash(await shaHex(raw)):null;
      if(!reset)return authPage("Reset link invalid",`<h1>Reset link invalid</h1><div class="msg error">This password-reset link is invalid, expired, or already used.</div><a class="btn secondary" href="${base(url)}/forgot-password">Request another reset</a>`,400);
      const csrf=randomToken();const h=recoveryCookies(url,raw,csrf);h.set("location",`${base(url)}/reset-password`);return new Response(null,{status:303,headers:h});
    }
    if(req.method==="GET"&&path==="/reset-password"){
      const state=await recovery(req);if(!state)return authPage("Reset link invalid",`<h1>Reset link invalid</h1><div class="msg error">This password-reset link is invalid, expired, or already used.</div><a class="btn secondary" href="${base(url)}/forgot-password">Request another reset</a>`,400);
      const b=base(url);return authPage("Reset password",`<h1>Choose a new password</h1><p>The reset link has been verified.</p><form method="post" action="${b}/reset-password"><input type="hidden" name="csrf" value="${esc(state.csrf)}"><div class="field"><label for="next">New password</label><input id="next" name="next" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="field"><label for="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><button class="btn" type="submit">Set new password</button><p class="muted">Minimum 12 characters with uppercase, lowercase, number and symbol.</p></form>`);
    }
    if(req.method==="POST"&&path==="/reset-password"){
      const state=await recovery(req);if(!state)return authPage("Reset link invalid","<h1>Reset link invalid</h1><div class=\"msg error\">This password-reset session is invalid or expired.</div>",400);
      const f=await req.formData();const c=String(f.get("csrf")??"");if(!c||c!==state.csrf)return authPage("Request rejected","<h1>Request rejected</h1><p>Reload and try again.</p>",403);
      const next=String(f.get("next")??"");const confirm=String(f.get("confirm")??"");if(next!==confirm||!strong(next))return authPage("Password not changed","<h1>Password not changed</h1><div class=\"msg error\">The new password does not meet the password requirements.</div>",400);
      if(!(await consumeResetToken(await shaHex(state.token),next)))return authPage("Reset link invalid","<h1>Reset link invalid</h1><div class=\"msg error\">This password-reset link is invalid, expired, or already used.</div>",400);await audit("admin_password_reset_completed",state.admin.id,clientHash,ua,{});
      const h=recoveryCookies(url,"","",0);h.set("location",`${base(url)||""}/?password=reset`);return new Response(null,{status:303,headers:h});
    }

    const s=await session(req);
    if(req.method==="GET"&&path==="/session")return s?json({authenticated:true,email:s.admin.email,role:s.admin.role,expires_at:s.expires_at}):json({authenticated:false},401);
    if(req.method==="POST"&&path==="/logout"){
      if(!s)return loginPage(url,"Your session has expired.",true);const f=await req.formData();if(!(await csrfOk(s,String(f.get("csrf")??""))))return authPage("Request rejected","<h1>Request rejected</h1><p>Reload and try again.</p>",403);
      await revokeSession(s.id);await audit("admin_logout",s.admin.id,clientHash,ua,{});const h=authCookies(url,"","",0);h.set("location",base(url)||"/");return new Response(null,{status:303,headers:h});
    }
    if(req.method==="GET"&&path==="/change-password"){
      if(!s)return loginPage(url,"Please sign in to continue.",true);const b=base(url);return authPage("Change password",`<h1>Change password</h1><p>Verify the current password before choosing a new one.</p><form method="post" action="${b}/change-password"><input type="hidden" name="csrf" value="${esc(s.csrf)}"><div class="field"><label for="current">Current password</label><input id="current" name="current" type="password" autocomplete="current-password" maxlength="256" required></div><div class="field"><label for="next">New password</label><input id="next" name="next" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="field"><label for="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></div><div class="actions"><button class="btn" type="submit">Update password</button><a class="btn secondary" href="${b||"/"}">Cancel</a></div><p class="muted">Minimum 12 characters with uppercase, lowercase, number and symbol.</p></form>`);
    }
    if(req.method==="POST"&&path==="/change-password"){
      if(!s)return loginPage(url,"Your session has expired.",true);const f=await req.formData();if(!(await csrfOk(s,String(f.get("csrf")??""))))return authPage("Request rejected","<h1>Request rejected</h1><p>Reload and try again.</p>",403);
      const current=String(f.get("current")??"");const next=String(f.get("next")??"");const confirm=String(f.get("confirm")??"");if(next===current||next!==confirm||!strong(next)||!(await changePassword(s.admin.id,current,next))){await audit("admin_password_change_failed",s.admin.id,clientHash,ua,{});return authPage("Password not changed",`<h1>Password not changed</h1><div class="msg error">Current password verification or new-password requirements failed.</div><a class="btn secondary" href="${base(url)}/change-password">Try again</a>`,400);}
      await audit("admin_password_changed",s.admin.id,clientHash,ua,{});const h=authCookies(url,"","",0);h.set("location",`${base(url)||""}/?password=changed`);return new Response(null,{status:303,headers:h});
    }
    if(req.method==="GET"&&path==="/"){
      if(!s){const flag=url.searchParams.get("password");const m=flag==="changed"?"Password updated. Sign in again.":flag==="reset"?"Password reset completed. Sign in with the new password.":"";return loginPage(url,m,false);}
      return accountPage(url,s);
    }
    return authPage("Not found","<h1>Not found</h1><p>The requested administration route does not exist.</p>",404);
  }catch{return authPage("Service unavailable","<h1>Administration unavailable</h1><p>Please try again shortly.</p>",503);}
});
