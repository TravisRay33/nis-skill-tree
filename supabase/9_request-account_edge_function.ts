// NIS Skill Tree: "request-account" Edge Function
// Called from the sign-in page ("Create an NIS Skill account"). Saves the request for staff to approve
// and emails staff so they know to go to Approvals. Nobody is signed in when this runs.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > Via Editor.
//   Name it exactly:  request-account      Paste this whole file, then Deploy.
//   Then open the function's settings and turn OFF "Verify JWT" (people asking for an account are not signed in).
// Secrets (Edge Functions > Secrets):
//   STAFF_EMAIL      where the notice goes, e.g. travisaray@yahoo.com (several: separate with commas)
//   RESEND_API_KEY   free key from resend.com (API Keys > Create). Without it, requests still work, just no email.
//   SITE_URL         optional, your site's address, put as a link in the email
//   EMAIL_FROM       optional. Leave unset to send from onboarding@resend.dev, which Resend only allows to
//                    the email you signed up to Resend with. To email other addresses, verify a domain in Resend.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const MAX_PENDING = 25;   // stops anyone from flooding staff with requests

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    try { const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); serviceKey = keys.default ?? Object.values(keys)[0] ?? serviceKey; } catch (_) { /* keep legacy key */ }
    if (!serviceKey) return json({ error: "No service key found for this function." }, 500);
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const username = String(body.username ?? "").trim().toLowerCase();
    if (!name) return json({ error: "Please enter your name." }, 400);
    if (!/^[a-z0-9._-]{2,40}$/.test(username)) {
      return json({ error: "Usernames can use letters, numbers, dots, dashes and underscores (2 to 40 characters)." }, 400);
    }

    const { data: taken } = await db.from("people").select("id").eq("username", username).maybeSingle();
    if (taken) return json({ error: "That username already has an account. Try signing in, or ask staff to reset your password." }, 400);
    const { data: dup } = await db.from("account_requests").select("id").eq("username", username).eq("status", "pending").maybeSingle();
    if (dup) return json({ ok: true, already: true });   // same answer as success: nothing new to do
    const { count } = await db.from("account_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
    if ((count ?? 0) >= MAX_PENDING) return json({ error: "There are a lot of requests waiting right now. Please ask NIS staff in person." }, 429);

    const { error } = await db.from("account_requests").insert({ name, username });
    if (error) return json({ error: error.message }, 400);
    await db.from("activity_log").insert({ text: `${name} (${username}) asked for an account` });

    // email staff (optional)
    const key = Deno.env.get("RESEND_API_KEY"), to = (Deno.env.get("STAFF_EMAIL") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    let emailed = false;
    if (key && to.length) {
      const site = Deno.env.get("SITE_URL") ?? "";
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") ?? "NIS Skill Tree <onboarding@resend.dev>",
          to,
          subject: `NIS Skill Tree: account request from ${name}`,
          text: `${name} (NIS username: ${username}) asked for an NIS Skill Tree account.\n\n` +
            `To approve it, sign in${site ? ` at ${site}` : ""}, open Approvals, and use "New account requests" at the top.\n` +
            `After you approve, tell them to sign in with their NIS username and the starter password.`,
        }),
      });
      emailed = r.ok;
    }
    return json({ ok: true, emailed });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
