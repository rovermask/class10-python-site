# Class 10 Python: class website

A static website for students, plus a teacher area at `/admin` that needs a username and password.

| Path | Who | What |
| --- | --- | --- |
| `/` | Everyone | Home page |
| `/quiz` | Everyone | 6 unit quizzes, 120 questions (Strings, Lists, Modules & Packages, NumPy, Pandas, Matplotlib) |
| `/lab` | Everyone | Visual Lab: an interactive visual for every lesson |
| `/practice` | Everyone | Strings practice sheet (110 questions, printable) |
| `/admin` | Teacher only | Answer keys for all quizzes and the practice sheet |

## Where the password lives

The password is **not** stored in any file here. `proxy.js` runs on Vercel before any `/admin` page is sent and checks the
username and password against two environment variables you set in the Vercel dashboard:

- `ADMIN_USER`
- `ADMIN_PASS`

Environment variables stay on Vercel's servers and are never sent to the browser, so students cannot see them even in the page source.

## Deploy

1. Put this folder in a GitHub repository (or run `npx vercel` inside it).
2. In Vercel: **Add New → Project**, import the repository.
   - Framework Preset: **Other**
   - Build Command: leave empty
   - Output Directory: leave as default (the project root)
3. Before or after the first deploy, open **Project → Settings → Environment Variables** and add `ADMIN_USER` and `ADMIN_PASS`
   for the Production (and Preview) environments.
4. Redeploy (Deployments → ⋯ → Redeploy). Environment variable changes only apply to new deployments.
5. Check it: open `https://<your-site>.vercel.app/admin`. The browser should ask for a username and password.
   If it shows the answer keys without asking, the middleware did not run. Check the build log for `proxy.js`.

To change the password later, edit `ADMIN_PASS` in Vercel and redeploy.

## Good to know

- **Scores are not saved anywhere.** There is no database, so results only appear on the student's own screen.
- **Quiz answers are inside the quiz page,** lightly scrambled. That stops casual peeking, not a student who digs through browser developer tools. Run graded tests in class.
- **Local preview:** any static server works for the student pages (`npx serve .`). The `/admin` lock only runs on Vercel,
  or locally with `npx vercel dev`.
- Questions are built into the pages. To change them, edit the question source (kept outside this folder, so answers are never
  deployed as plain files), rebuild, and redeploy.
