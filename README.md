# GIS Toolbox

Free browser-based GIS and data prep toolkit — import, transform, visualize, and export geospatial data (Shapefile, GeoJSON, KML/KMZ, GPX, CSV, Excel, and more).

## Development workflow

All development happens on the **`staging`** branch, locally.

1. Make changes locally (with Cursor or your editor)
2. Commit on `staging` using **GitHub Desktop**
3. Push `staging` to deploy the preview
4. When ready for production, merge `staging` → `main` in **GitHub Desktop**

We do **not** use feature branches or pull requests for normal development.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for details and [AGENTS.md](AGENTS.md) for AI agent instructions.

Building a **GIS Widget** (left-panel wizard)? Start with [docs/WIDGET_AGENT_PLAYBOOK.md](docs/WIDGET_AGENT_PLAYBOOK.md).

## Local setup

```bash
npm install
npm run dev
```

## Branches

| Branch | Purpose |
|--------|---------|
| `staging` | Development and preview |
| `main` | Production |

## Deployment

Pushes to `staging` or `main` trigger GitHub Pages deployment via `.github/workflows/deploy-pages.yml`.
