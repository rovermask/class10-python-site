# Class 10 Python: quiz site

A static quiz website for students, plus a teacher area at `/admin` that needs a username and password.

| Path | Who | What |
| --- | --- | --- |
| `/` | Everyone | List of all quizzes |
| `/quiz/<unit>` | Everyone | One quiz per unit: `strings`, `lists`, `modules`, `pandas`, `matplotlib` (20 questions each) and `numpy` (140 questions in 7 topics; link one topic with `/quiz/numpy#slicing`) |
| `/admin` | Teacher only | Answer keys for every quiz |

## Environment variables (Vercel → Project → Settings → Environment Variables)

No secrets are stored in any file here. `proxy.js` reads these when someone opens `/admin`. Set them, then redeploy:

| Name | What |
| --- | --- |
| `ADMIN_USER`, `ADMIN_PASS` | The teacher's login for `/admin` |

## Deploy

1. Put this folder in a GitHub repository.
2. In Vercel: **Add New → Project**, import the repository. Framework Preset: **Other**. Leave Build Command empty and
   Output Directory as default.
3. Add the environment variables above for Production, then redeploy (Deployments → ⋯ → Redeploy).
4. Check it: open `https://<your-site>.vercel.app/admin`. The browser should ask for a username and password.

## Good to know

- **Scores are not saved anywhere.** There is no database, so results only appear on the student's own screen.
- **Quiz answers are inside each quiz page,** lightly scrambled. That stops casual peeking, not a student who digs through
  browser developer tools. Run graded tests in class.
- **Local preview:** any static server works for the student pages. The `/admin` lock only runs on Vercel,
  or locally with `npx vercel dev`.
- Questions are built into the pages. To change them, edit the question source (kept outside this folder, so answers are
  never deployed as plain files), rebuild, and redeploy.
