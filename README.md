# Class 10 Python: quiz site

A static quiz website for students, plus a teacher area at `/admin` that needs a username and password.

| Path | Who | What |
| --- | --- | --- |
| `/` | Everyone | List of the quizzes the teacher has chosen to show |
| `/quiz/<unit>` | Everyone, if shown | One quiz per unit: `strings`, `lists`, `modules`, `numpy`, `pandas`, `matplotlib` (20 questions each) |
| `/admin` | Teacher only | Show/hide switch for each quiz, and the answer keys |

## Showing and hiding quizzes

`visible.json` lists which quizzes students can see. A quiz that is `false` or missing is hidden: it is left off the home
page, and its `/quiz/...` link returns 404.

Ticking a box in `/admin` saves `visible.json` to this GitHub repository. Vercel sees the new commit and redeploys, so the
change reaches students in about a minute. The admin page says "Live" once it has.

Because the admin page commits to GitHub, run `git pull` in this folder before pushing your own changes.

## Environment variables (Vercel → Project → Settings → Environment Variables)

No secrets are stored in any file here. Set these, then redeploy:

| Name | What |
| --- | --- |
| `ADMIN_USER`, `ADMIN_PASS` | The teacher's login for `/admin` |
| `GITHUB_TOKEN` | Lets `/admin` save show/hide changes. See below |
| `GITHUB_REPO` | Optional. `owner/name` of this repo. Vercel normally fills it in by itself |
| `GITHUB_BRANCH` | Optional. Defaults to `main` |

To make `GITHUB_TOKEN`: GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** →
Generate new token. Under Repository access, choose **Only select repositories** and pick this repo. Under Permissions,
set **Contents** to **Read and write**. Copy the token into Vercel as `GITHUB_TOKEN`.

## Deploy

1. Put this folder in a GitHub repository.
2. In Vercel: **Add New → Project**, import the repository. Framework Preset: **Other**. Leave Build Command empty and
   Output Directory as default.
3. Add the environment variables above for Production, then redeploy (Deployments → ⋯ → Redeploy).
4. Check it: open `https://<your-site>.vercel.app/admin`. The browser should ask for a username and password, and the
   switches should load without an error.

## Good to know

- **Scores are not saved anywhere.** There is no database, so results only appear on the student's own screen.
- **Quiz answers are inside each quiz page,** lightly scrambled. That stops casual peeking, not a student who digs through
  browser developer tools. Run graded tests in class.
- **Local preview:** any static server works for the student pages. The `/admin` lock and show/hide only run on Vercel,
  or locally with `npx vercel dev`.
- Questions are built into the pages. To change them, edit the question source (kept outside this folder, so answers are
  never deployed as plain files), rebuild, and redeploy.
