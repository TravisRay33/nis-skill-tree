# NIS Skill Tree: putting it online

About 30 minutes, start to finish. Everything here is free and runs outside UNL systems.

- **GitHub** holds the code and its full history while we develop. It also shows a sample-data preview of the site.
- **Supabase** stores the real data and handles sign-in.
- **Netlify** hosts the finished site that testers and staff use.
- Nobody needs a UNL login. People sign in with their **NIS username** and a **starter password** you give them. They can keep it or pick their own any time with the **Change password** button.

Files you will use (all in this folder):

| File | Used in |
| --- | --- |
| `supabase/1_schema.sql` | Step 2 |
| `supabase/2_starter_content.sql` | Step 2 |
| `supabase/3_make_me_admin.sql` | Step 4 |
| `supabase/4_manage-users_edge_function.ts` | Step 5 |
| `docs/js/config.js` | Step 6 |
| the `docs` folder | Step 7 |
| the whole codebase folder | Step 0 |

The website itself lives in the `docs` folder. (GitHub requires that name to show a preview.)

---

## 0. Put the code on GitHub (development home)

1. Sign up at github.com.
2. Click **+ > New repository**. Name: `nis-skill-tree`. Choose **Public** (the free plan only shows previews for public projects; nothing secret is in these files). Click **Create repository**.
3. On the new page, click **uploading an existing file**. Open the **NIS Skill Tree Codebase** folder and drag everything inside it (`docs`, `supabase`, `README.md`, `SETUP-GUIDE.md`) onto the page. Click **Commit changes**.
4. Optional preview: **Settings > Pages > Build and deployment**: choose **Deploy from a branch**, then **main** and **/docs**, and **Save**. After a few minutes the sample-data version appears at `https://<your-username>.github.io/nis-skill-tree/`. It always runs in demo mode, so no one signs in there.

## 1. Create the Supabase project

1. Go to supabase.com and sign up (a personal email or GitHub login is fine).
2. Click **New project**.
   - Name: `nis-skill-tree`
   - Database password: click **Generate**, then save it somewhere safe. You will rarely need it.
   - Region: pick a US region (Central or East).
3. Wait a minute or two for it to finish setting up.

## 2. Build the database

1. In the left sidebar, open **SQL Editor**, then **New query**.
2. Open `supabase/1_schema.sql` in Notepad, copy everything, paste it into the editor, and click **Run**. You should see "Success".
3. Start another **New query**. Paste all of `supabase/2_starter_content.sql` and click **Run**. This adds the six areas and the sample skills. You can rename or replace them later from the site.

## 3. Turn off public sign-ups

So that only people you add can get in:

1. Open **Authentication** in the sidebar, then **Sign In / Providers** (on some screens it's under **Configuration**).
2. Turn **off** "Allow new users to sign up". Leave the **Email** provider turned on.
3. Click **Save**.

## 4. Create your own admin login

1. Open **Authentication > Users**, click **Add user > Create new user**.
   - Email: your username followed by `@users.nis-skilltree.org`. For example: `tray@users.nis-skilltree.org`. No email is ever sent there; it's only how usernames are stored.
   - Password: your own password.
   - Tick **Auto Confirm User**.
2. Open `supabase/3_make_me_admin.sql` in Notepad. Change the username, your name, your home area, and the email to match what you just typed.
3. Paste it into a **New query** in the SQL Editor and click **Run**.

## 5. Add the "manage-users" function

This lets you add people and reset passwords from inside the site.

1. Open **Edge Functions** in the sidebar, then **Deploy a new function > Via Editor**.
2. Name it exactly `manage-users`.
3. Delete the sample code, paste everything from `supabase/4_manage-users_edge_function.ts`, and click **Deploy function**.
4. Open the function's **Details** (or settings) and turn **off** **Verify JWT** (it may say "Enforce JWT verification" or "Verify JWT with legacy secret"). Click **Save**. The function checks that the caller is a signed-in admin by itself, and with this left on, the browser can't reach it.
5. Open **Edge Functions > Secrets** and add two secrets:

   | Key | Value |
   | --- | --- |
   | `DEFAULT_PASSWORD` | the starter password everyone gets, at least 8 characters (for example `NISskills-2026`) |
   | `USERNAME_DOMAIN` | `users.nis-skilltree.org` (note the **s** in users; it must match `usernameDomain` in `config.js`) |

6. Click **Save**.

## 6. Connect the site to your project

1. In Supabase, open **Project Settings > API Keys** (or click **Connect** at the top). Copy:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **publishable** key (starts with `sb_publishable_`) or, on older projects, the **anon public** key. This key is meant to be public.
   - Never copy the **secret** or **service_role** key into the site.
2. Open `docs/js/config.js` in Notepad and fill in:

   ```js
   supabaseUrl: "https://abcd1234.supabase.co",
   supabaseAnonKey: "sb_publishable_...",
   ```

   Leave `mode: "auto"`. The site then runs live on Netlify and in demo mode everywhere else (GitHub preview, your computer). If you later give Netlify a custom address, add it to `liveHosts`.
3. Save the file, and upload the updated `config.js` to GitHub (open the `docs/js` folder in your repository, **Add file > Upload files**, commit).

## 7. Put the site on Netlify

1. Go to **app.netlify.com/drop** and sign up or log in (so the site stays up).
2. Drag the **`docs`** folder (not the whole codebase folder) onto the page.
3. In a few seconds you get a link ending in `.netlify.app`. To give it a friendlier name: **Project configuration > Change project name**, for example `nis-skill-tree` → `nis-skill-tree.netlify.app`.

**To update the site later:** see "How updates flow" below.

## 8. First sign-in and setup

1. Open your Netlify link and sign in with your username and password from step 4.
2. **Set area leads:** Skill tree > pick an area > **Edit tree** > choose the **Area lead** > **Save area**. (Leads need to be added as people first, see the next step.)
3. **Add people:** **Coverage & admin > People**. Enter each person's name, NIS username, role, and home area, then click **Add person**. They get the starter password from step 5.
4. Send each tester: the link, their username, and the starter password. They can change it any time with **Change password**. (To require a new password at first sign-in instead, set `forcePasswordChange: true` in `docs/js/config.js`.)

**Forgot password?** As an admin, click **Reset password** next to their name. They can then sign in with the starter password again and pick a new one.

---

## Good to know

- **Free-plan pause:** Supabase pauses a free project after 7 days with no activity (for example over a break). If the site says it can't load, open Supabase and click **Restore project**; it takes about a minute.
- **Backups:** the free plan has no automatic backups. Once in a while, download **Growth > Download all sign-off events CSV**, which holds the full history.
- **Who can do what** is enforced by the database itself, not just the page: interns can only request and mark interest; area leads can approve and edit their own area; admins can do everything.
- **Practice copy:** double-click `docs/index.html` to use the sample-data version on your own computer.

## How updates flow

1. **Develop:** changes go into GitHub first (upload the changed files with **Add file > Upload files** and write a short note in the commit message, such as "Rename woodshop skills"). The GitHub preview shows the result with sample data.
2. **Test:** check the preview, or open `docs/index.html` on your computer.
3. **Release:** when a version is ready for real users, download it from GitHub (**Code > Download ZIP**, then unzip) or use your local folder, and drag the `docs` folder onto your Netlify project's **Deploys** page.
4. **Database changes** (new SQL files, if we ever add any) are pasted into the Supabase SQL Editor once, at release time.

Releasing by hand keeps Netlify's free-plan limit (about 20 releases a month) out of the way while you develop. Later, if you want releases to happen automatically, Netlify can connect to the GitHub repository and publish the `docs` folder from a dedicated `release` branch.

Editing skills, areas, and people does **not** need a release. That happens inside the live site and is saved in Supabase right away.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| "Almost there" page | `config.js` is still missing the URL or key (step 6). |
| "Username or password is incorrect" | Check the username. Admins can reset the password. |
| "You haven't been added to the skill tree yet" | The login exists but step 4's SQL (or Add person) didn't run for them. |
| Adding a person says "Failed to send a request to the Edge Function" or "Couldn't reach" | Check the function is named exactly `manage-users` and deployed, then turn off **Verify JWT** in its Details and save. |
| Adding a person fails with "Invalid JWT" or 401 | In **Edge Functions > manage-users > Details**, turn off **Verify JWT** and save. The function checks admin sign-in itself. |
| Adding a person says to set `DEFAULT_PASSWORD` | Add the secret in step 5. |
| "No areas yet" | Run `2_starter_content.sql` (step 2), or add an area from the site. |
