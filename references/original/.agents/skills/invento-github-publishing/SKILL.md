---
name: invento-github-publishing
description: Project-local workflow for publishing independent app, api and mobile repositories and a parent Git submodule repository.
---

# Invento GitHub publishing skill

Applies to Invento only. **Do not create remote repositories, push code, or choose a license on the user's behalf without confirmation.** Default visibility: **public** for `invento-app` and, unless user directs otherwise, propose public for the others; verify each before creation.

## Repository contract
- `invento-app`: independent React repository with its own `README.md`, `LICENSE`, `.gitignore`, `.env.example`, CI and lockfile.
- `invento-api`: independent Express/Prisma 7 repository with its own README, LICENSE, migration/seed instructions, env example, tests and CI.
- `invento-mobile`: independent Expo repository with its own README, LICENSE, Android setup, permission documentation and CI.
- `invento`: parent repository with `SPEC.md`, project-local `.agents/skills/`, design references, root README and `app`, `api`, `mobile` as Git submodules. Parent contains no duplicated child source.

## Publication sequence
1. Confirm GitHub owner/org, remote visibility per repository, chosen license (MIT proposal), and permission to publish; scan for secrets and sensitive user data.
2. Initialize each child as its own Git repo, commit working baseline, add its license and README, run checks, create remote with requested visibility, push independently.
3. Initialize parent repository, ensure child directories are not ordinary tracked folders, then add child repos using `git submodule add <remote> app` (and `api`, `mobile`). Commit `.gitmodules` and pinned submodule SHAs.
4. Publish parent repository separately. Verify `git clone --recurse-submodules <parent>` works, and child CI runs independently.
5. Never commit `.env`, JWT keys, private audio, customer data, production SQLite files, credentials or generated build artifacts. Use secret scanning and branch protection.
6. Update child repos first; then update pinned submodule commits in parent. Tag releases independently and document compatibility in root README.

## Checklist
- [ ] Four GitHub remotes and visibility approved
- [ ] README + LICENSE in each repo and parent
- [ ] CI, lockfile, reproducible setup and sample env
- [ ] No secrets, private data, local database or voice recordings committed
- [ ] Submodules point to exact expected commits
- [ ] Fresh recursive clone builds
