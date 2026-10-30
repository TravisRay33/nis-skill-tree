# NIS Skill Tree

Plain HTML, CSS, and JavaScript on the front end; Supabase (Postgres database + sign-in) behind it; hosted as a static site on Netlify. Code and history live on GitHub. No build step.

**To put it online, follow `SETUP-GUIDE.md`.**

## Two modes
Set in `docs/js/config.js`. The default `mode: "auto"` runs live on Netlify (`*.netlify.app` or any address in `liveHosts`) and demo everywhere else, so the same files work on GitHub, Netlify, and your computer.
- `mode: "demo"`: sample people and skills live only in your browser; use the "Viewing as" menu to act as anyone. Double-click `docs/index.html` to run it. Nothing is saved.
- `mode: "live"`: shared Supabase database, real sign-in with NIS username and password.

## Folders
| Path | What it holds |
| --- | --- |
| `docs/` | The website (GitHub Pages requires the name `docs`). |
| `docs/index.html` | Page shell. Loads the CSS and scripts in order. |
| `docs/css/styles.css` | All styling. Color variables at the top (light and dark mode). |
| `docs/js/config.js` | Mode (auto, live, demo), Supabase address and public key, username domain, password rule. |
| `docs/js/supabase.min.js` | Supabase browser library (v2.117.3), stored locally. |
| `docs/js/data.js` | Sample content used by demo mode (and the source of the starter SQL). |
| `docs/js/app.js` | Screens and logic: skill tree, edit mode, profile with radial tree, approvals, admin, growth over time. |
| `docs/js/api.js` | Data layer. `DemoAPI` (in-browser) and `LiveAPI` (Supabase) expose the same actions. Also the sign-in and change-password screens and startup. |
| `supabase/1_schema.sql` | Tables, security rules, and the functions every change goes through. |
| `supabase/2_starter_content.sql` | The six areas and sample skills. |
| `supabase/3_make_me_admin.sql` | Makes the first admin. |
| `supabase/4_manage-users_edge_function.ts` | Admin-only function to add people and reset passwords. |

Script load order matters: config, supabase, data, app, api.

## How security works
- Everyone signed in can read the trees, people, and records (transparency is the point).
- Nobody writes to tables directly. Every change calls a database function that checks permissions first:
  - interns: request sign-offs, withdraw requests, mark "want to learn", change own password
  - area leads: approve or return requests and edit the tree for their own area
  - admins: everything, including overrides, areas, people, and password resets
- Public sign-up is turned off, so only people an admin adds can sign in.

## Data for research
Every sign-off and removal is stored as a timestamped event (`events` table). The Growth page charts skills held over any date range for chosen people and exports two CSVs: a per-person summary for the range and the full event log.

## Tested
- Demo mode: click-through of every screen in a headless browser.
- Live mode: the SQL was run on Postgres 16 and every permission rule was checked as an intern, an area lead, and an admin. The full sign-in, change password, request, approve, edit tree, add person, and reset password flow was run in a browser against a local stand-in for Supabase. The real Supabase and Netlify setup is in `SETUP-GUIDE.md`.

## Workflow
GitHub = development (every change committed, sample-data preview on GitHub Pages). Netlify = released version for real users, updated by dragging the `docs` folder. Details in `SETUP-GUIDE.md` under "How updates flow".
