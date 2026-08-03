// ── JobTrack — Supabase config ─────────────────────────────────────────────
// Replace the two values below with your own project URL and anon key.
// You can find them in: Supabase dashboard → Project Settings → API
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';   // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';

// ── Client ─────────────────────────────────────────────────────────────────
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    storageKey: 'jobtrack-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// ── Page routing helper ─────────────────────────────────────────────────────
// Call this at the top of every protected page.
// role: 'admin' = full app, 'drafter' = my-tasks only
// Returns the profile if authorized, otherwise redirects and returns null.
async function requireAuth(requiredRole){
  const { data:{ session } } = await db.auth.getSession();
  if(!session){
    if(window.location.pathname.endsWith('login.html')) return null; // already there
    window.location.replace('login.html');
    return null;
  }
  const { data: profile } = await db
    .from('jt_user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if(!profile){
    await db.auth.signOut();
    window.location.replace('login.html');
    return null;
  }

  // Admin trying to hit drafter page — send to full app
  if(requiredRole === 'drafter' && profile.role === 'admin'){
    window.location.replace('index.html');
    return null;
  }
  // Drafter trying to hit admin page — send to their tasks
  if(requiredRole === 'admin' && profile.role !== 'admin'){
    window.location.replace('my-tasks.html');
    return null;
  }

  return { session, profile };
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }
function daysDiff(d){ if(!d)return null; const t=new Date(d+'T00:00:00'),n=new Date(); n.setHours(0,0,0,0); return Math.round((t-n)/86400000); }
function fmtDate(d){ if(!d)return'—'; const[y,m,day]=d.split('-'); return`${m}/${day}/${y}`; }
function calcStartDate(dueStr,hrs,hpd){
  if(!dueStr||!hrs||hrs<=0)return null;
  hpd=hpd||8; let left=hrs;
  let d=new Date(dueStr+'T00:00:00');
  while(left>0){ if(d.getDay()!==0&&d.getDay()!==6)left-=hpd; if(left>0)d.setDate(d.getDate()-1); }
  while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}
function getHours(t){ return parseFloat(t.hours_custom)||parseFloat(t.hours)||0; }

// ── Toast notification ─────────────────────────────────────────────────────
function toast(msg, type='info'){
  const el=document.createElement('div');
  el.style.cssText=`position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.4s;background:${type==='error'?'#A32D2D':type==='ok'?'#27500A':'#185FA5'}`;
  el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.remove(),400); },2500);
}
