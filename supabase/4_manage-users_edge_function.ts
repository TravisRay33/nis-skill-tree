// NIS Skill Tree: "manage-users" Edge Function
// Lets an admin add people (username + default password) and reset passwords from the site.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > Via Editor.
//   Name it exactly:  manage-users
//   Paste this whole file, then Deploy.
// Secrets (Edge Functions > Secrets):
//   DEFAULT_PASSWORD   the starter password everyone gets (at least 8 characters)
//   USERNAME_DOMAIN    users.nis-skilltree.org   (must match usernameDomain in config.js)
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    // Works with both the new secret keys and the legacy service_role key
    let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    try { const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); serviceKey = keys.default ?? Object.values(keys)[0] ?? serviceKey; } catch (_) { /* keep legacy key */ }
    const DEFAULT_PASSWORD = Deno.env.get("DEFAULT_PASSWORD");
    const DOMAIN = Deno.env.get("USERNAME_DOMAIN") ?? "users.nis-skilltree.org";
    if (!serviceKey) return json({ error: "No service key found for this function." }, 500);
    if (!DEFAULT_PASSWORD || DEFAULT_PASSWORD.length < 8) {
      return json({ error: "Set the DEFAULT_PASSWORD secret (8+ characters) in Supabase first." }, 500);
    }

    // Who is calling? Must be a signed-in, active admin. (Checked here, so platform JWT checks can be off.)
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!user) return json({ error: "Please sign in again." }, 401);
    const { data: me } = await admin.from("people").select("name, role, active").eq("id", user.id).single();
    if (!me || me.role !== "admin" || !me.active) return json({ error: "Admins only." }, 403);

    const body = await req.json();

    if (body.action === "create") {
      const username = String(body.username ?? "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,40}$/.test(username)) {
        return json({ error: "Usernames can use letters, numbers, dots, dashes and underscores (2 to 40 characters)." }, 400);
      }
      const name = String(body.name ?? "").trim() || username;
      const role = ["admin", "lead", "intern"].includes(body.role) ? body.role : "intern";
      const { data: created, error } = await admin.auth.admin.createUser({
        email: `${username}@${DOMAIN}`, password: DEFAULT_PASSWORD, email_confirm: true, user_metadata: { username },
      });
      if (error) return json({ error: /already|exists|registered/i.test(error.message) ? "That username is already taken." : error.message }, 400);
      const { error: rowError } = await admin.from("people").insert({
        id: created.user.id, username, name, role, home_area: body.home_area || null,
        end_date: body.end_date || null, active: true, must_change_password: true,
      });
      if (rowError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: rowError.message }, 400);
      }
      await admin.from("activity_log").insert({ actor: user.id, text: `${me.name} added ${name} (${username})` });
      return json({ ok: true, id: created.user.id });
    }

    if (body.action === "reset") {
      const id = String(body.person_id ?? "");
      const { data: target } = await admin.from("people").select("name").eq("id", id).single();
      if (!target) return json({ error: "Person not found." }, 404);
      const { error } = await admin.auth.admin.updateUserById(id, { password: DEFAULT_PASSWORD });
      if (error) return json({ error: error.message }, 400);
      await admin.from("people").update({ must_change_password: true }).eq("id", id);
      await admin.from("activity_log").insert({ actor: user.id, text: `${me.name} reset the password for ${target.name}` });
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
