/* NIS Skill Tree settings. See SETUP-GUIDE.md for where each value comes from. */
window.NIS_CONFIG = {
  // "auto" = live on the Netlify site, demo everywhere else (GitHub Pages preview, your own computer)
  // "live" = always use the shared Supabase database with real sign-in
  // "demo" = always use sample data that lives only in the browser (nothing is saved)
  mode: "auto",

  // Web addresses that should run live when mode is "auto". Any *.netlify.app address counts too.
  liveHosts: [],

  // Supabase > Project Settings > API (or Connect) > Project URL
  supabaseUrl: "",

  // Supabase > Project Settings > API Keys > the "publishable" (or legacy "anon") key.
  // This key is meant to be public; the database rules decide what each signed-in person can do.
  supabaseAnonKey: "",

  // Usernames are stored as <username>@<this domain>. No email is ever sent to it.
  // Must match the USERNAME_DOMAIN secret on the manage-users function.
  usernameDomain: "users.nis-skilltree.org",

  // true = people must choose their own password the first time they sign in with the starter password
  forcePasswordChange: true
};
(function(c){
  if(c.mode!=="auto") return;
  const h=location.hostname;
  c.mode = (h.endsWith(".netlify.app") || (c.liveHosts||[]).includes(h)) ? "live" : "demo";
})(window.NIS_CONFIG);
