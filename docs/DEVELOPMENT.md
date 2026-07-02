# Development Guide — GIS Toolbox

## Workflow overview

This project uses a **local-first, two-branch** workflow. There are no feature branches and no pull requests for normal development.

```
┌─────────────────────────────────────────────────────────┐
│  1. Edit locally on staging (Cursor, editor, etc.)      │
│  2. Commit on staging via GitHub Desktop                │
│  3. Push staging → preview site updates                 │
│  4. Merge staging → main in GitHub Desktop → production │
└─────────────────────────────────────────────────────────┘
```

## Branches

### `staging` (development)

- All feature work and bug fixes happen here
- Agents and editors make local file changes on this branch
- Push to deploy the staging preview at `/gis-toolbox/staging/`

### `main` (production)

- Production release branch only
- **Do not develop on `main`**
- Merge from `staging` in GitHub Desktop when ready to release

## What we do NOT use

- Feature branches (`feature/*`, `fix/*`, etc.)
- Pull requests for solo development
- GitHub website for merges (use GitHub Desktop)
- Agent-initiated commits or pushes (unless explicitly requested)

## GitHub Desktop steps

### Daily development

1. Ensure you are on the `staging` branch
2. Make changes locally (with or without Cursor)
3. Review changes in GitHub Desktop
4. Write a commit message and commit
5. Push `staging` to origin

### Releasing to production

1. Ensure `staging` is pushed and tested on the preview site
2. In GitHub Desktop, merge `staging` into `main`
3. Push `main` to origin
4. Production site updates automatically

## AI agents (Cursor)

Project rules live in `.cursor/rules/` and apply to every agent session:

| File | Purpose |
|------|---------|
| `git-workflow.mdc` | Mandatory git workflow — always applied |
| `project-core.mdc` | Project entry point and code standards |

Full agent instructions: [AGENTS.md](../AGENTS.md)

### Agent do's

- Edit files locally on `staging`
- Iterate with the user until changes are ready
- Remind the user to commit/push via GitHub Desktop when done

### Agent don'ts

- Create feature branches
- Open pull requests
- Commit, push, or merge without explicit user request
- Edit `main` during normal development

## Deployment

Workflow: `.github/workflows/deploy-pages.yml`

| Trigger | Result |
|---------|--------|
| Push to `staging` | Staging preview built and deployed |
| Push to `main` | Production site built and deployed |

No manual deploy step is required.

## Local setup

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm test         # run tests
```

## Optional: Cursor User Rules note

If you have global Cursor User Rules that mention pull requests or `gh pr create`, add this line to your **User Rules** in Cursor Settings so they do not conflict with this repo:

> For the **gis-toolbox** repository, follow project rules in `.cursor/rules/` — local staging workflow only, no PRs, no feature branches.

Project rules in `.cursor/rules/` take precedence when working in this repo.
