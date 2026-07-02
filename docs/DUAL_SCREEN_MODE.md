# Dual Screen Mode

Dual Screen Mode moves the MapLibre map into a second browser window while the primary window keeps panels, widgets, GIS tools, and workflow UI. State stays in the primary window; the map window renders layers and handles map interactions.

## Activate / deactivate

1. Click **Dual Screen** in the header or workflow toolbar (desktop only, width ≥ 768px).
2. Primary captures viewport, tears down its map, and opens `map-window.html` in a popup.
3. Windows sync over `BroadcastChannel` (`gis-toolbox-dual-screen`).
4. **Exit Dual Screen** closes the map window and restores the map in the center panel.

After a page reload, dual screen is **not** reopened automatically. A sessionStorage hint shows a reminder toast; click Dual Screen again to open the map window.

## Architecture

| Window | Role |
|--------|------|
| Primary (`index.html`) | Layers, widgets, tools, state, `dualScreenCoordinator` |
| Secondary (`map-window.html`) | MapLibre map, draw toolbar, fence draw, map export |

While dual screen is active, `mapService.getMap()` returns `null` on the primary window. All map operations must go through `mapService` methods — the decorator in [`js/dual-screen/dual-screen-map-service.js`](../js/dual-screen/dual-screen-map-service.js) relays them to the secondary window.

## Message types

| Type | Direction | Purpose |
|------|-----------|---------|
| `HELLO` | Both | Handshake when map window loads |
| `SNAPSHOT` | Primary → Secondary | Full layer/style/viewport sync |
| `LAYER_ADD` / `LAYER_REMOVE` / `LAYER_ORDER` / `LAYER_STYLE` | Primary → Secondary | Incremental layer updates |
| `VIEWPORT` | Both | Fit/zoom commands + viewport broadcast |
| `SELECTION` | Both | Feature selection + active layer |
| `MAP_CHROME` | Secondary → Primary | Basemap / 3D changes from map window |
| `DRAW_CMD` / `DRAW_EVENT` | Both | Draw toolbar + fence + search marker |
| `MAP_RPC` / `MAP_RPC_RESULT` | Both | Async map picks and sketches |
| `MAP_PICK_POINT` | Secondary → Primary | Streaming clicks during continuous point pick |
| `MAP_CMD` | Primary → Secondary | Fire-and-forget map commands (previews, query overlay, temp features) |
| `BYE` | Both | Close / deactivate |

## Map operation routing

| Operation | Mechanism |
|-----------|-----------|
| Point/rectangle/sketch picks | `MAP_RPC` |
| Continuous point pick (Wireless) | `MAP_RPC` + `MAP_PICK_POINT` stream |
| Layer add/remove/order/style | Decorator → `LAYER_*` or `SNAPSHOT` |
| Workspace / incremental import | `MAP_CMD` + `SNAPSHOT` |
| Query highlight/zoom/pulse | `MAP_CMD` |
| Temp previews | `MAP_CMD` |
| Fit / zoom | `VIEWPORT` |
| Selection | `SELECTION` |

## Widget / tool guidelines

- Use `mapService` only — never `mapService.getMap()` in widget controllers or tools.
- Use `getMapViewContextForUi(mapService, dualScreenCoordinator)` for panel UI that needs zoom/latitude.
- Open widgets via `openReactIsland` with `docked: true` so modals reposition on toggle.
- Test each map interaction in single screen, dual screen, and after toggling back.

## Manual smoke checklist

Run in **single → dual → single** order:

1. All GIS widgets: one map interaction + run (Query highlight/zoom; Wireless pole draw + coverage)
2. GIS tools: point pick, rectangle draw, clip-to-extent
3. Layer panel zoom-to-layer
4. Bulk select → toggle dual screen → selection visible → toggle back → highlights restored
5. Import large (>10k) and workspace layer while dual screen active
6. Open docked widget → toggle dual screen → modal repositions
7. Toggle dual screen during sketch pick → interaction cancels cleanly
8. Export project kit in dual screen → viewport saved
9. PNG export from secondary map window

## Known limitations

- Map PNG/PDF/GIF export from the **primary** header is blocked while dual screen is active — use the map window print menu.
- Orbit GIF recording requires the map in the primary window.
- Page reload does not auto-open the map window.
- Non-docked modals (Import, Filter Builder) do not reposition on dual screen toggle.

## Key files

| File | Role |
|------|------|
| [`js/dual-screen/coordinator.js`](../js/dual-screen/coordinator.js) | Lifecycle, RPC, selection |
| [`js/dual-screen/dual-screen-map-service.js`](../js/dual-screen/dual-screen-map-service.js) | Primary mapService decorator |
| [`js/dual-screen/protocol.js`](../js/dual-screen/protocol.js) | Message types |
| [`js/dual-screen/map-view-context.js`](../js/dual-screen/map-view-context.js) | Zoom/latitude for UI panels |
| [`js/map-window.js`](../js/map-window.js) | Secondary window entry |
| [`react/ui/DockedWidgetModal.jsx`](../react/ui/DockedWidgetModal.jsx) | Modal placement on toggle |
