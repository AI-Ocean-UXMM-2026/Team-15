# Invento

Android-first inventory management for Myanmar warehouse operators. This folder is a **local planning workspace, not a Git repository**.

Read [SPEC.md](SPEC.md) for product and technical requirements. Source documents and UI references are in `references/` and `user-flows/`. Project-local skills live in `.agents/skills/`:

- `invento-i18n` — English/Burmese typography, terminology and localization
- `invento-github-publishing` — independent child repos + parent Git submodules

## Planned repository topology

```text
invento/              # parent repo (future)
├── SPEC.md
├── .agents/skills/
├── design-system/
├── icons/
├── references/
├── app/               # invento-app Git submodule (future)
├── api/               # invento-api Git submodule (future)
└── mobile/            # invento-mobile Git submodule (future)
```

The three applications have **not** been scaffolded and no remote repos have been published. Do not treat provisional tokens as verified Anydesignstyem assets or placeholder icon mappings as Reicon assets.

## Confirmed Phase 1 decisions

One owner + four employees; no checkout; cloud English/Burmese AI voice with human confirmation; offline cached inventory viewing only (online stock writes). See SPEC.md for milestone gates and remaining vendor/deployment decisions.
