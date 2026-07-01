/**
 * In-memory widget state for workspace export/import.
 */

/** @type {{ type: string, open: boolean, state: object }[]} */
let activeWidgets = [];

function cloneState(state) {
    return JSON.parse(JSON.stringify(state ?? {}));
}

/**
 * @returns {{ activeWidgets: { type: string, open: boolean, state: object }[] }}
 */
export function serializeWidgetStore() {
    return {
        activeWidgets: activeWidgets.map((entry) => ({
            type: entry.type,
            open: !!entry.open,
            state: cloneState(entry.state)
        }))
    };
}

/**
 * @param {{ activeWidgets?: { type: string, open: boolean, state: object }[] }} payload
 */
export function loadWidgetStore(payload = {}) {
    activeWidgets = Array.isArray(payload.activeWidgets)
        ? payload.activeWidgets.map((entry) => ({
            type: entry.type,
            open: !!entry.open,
            state: cloneState(entry.state)
        }))
        : [];
}

/**
 * @param {string} type
 * @returns {{ type: string, open: boolean, state: object }|null}
 */
export function getWidgetEntry(type) {
    return activeWidgets.find((entry) => entry.type === type) || null;
}

/**
 * @param {string} type
 * @param {{ open?: boolean, state?: object }} patch
 */
export function upsertWidgetState(type, { open = true, state = {} } = {}) {
    const existing = activeWidgets.find((entry) => entry.type === type);
    if (existing) {
        existing.open = open;
        existing.state = cloneState(state);
        return;
    }
    activeWidgets.push({ type, open, state: cloneState(state) });
}

/**
 * @param {string} type
 */
export function markWidgetClosed(type) {
    const existing = activeWidgets.find((entry) => entry.type === type);
    if (existing) {
        existing.open = false;
    }
}

/**
 * @param {Map<string, string>} idMap
 */
export function remapWidgetLayerIds(idMap) {
    if (!idMap?.size) return;

    for (const entry of activeWidgets) {
        const state = entry.state;
        if (!state || typeof state !== 'object') continue;

        if (Array.isArray(state.selectedLayerIds)) {
            state.selectedLayerIds = state.selectedLayerIds.map((id) => idMap.get(id) || id);
        }
        if (state.lastResultLayerId && idMap.has(state.lastResultLayerId)) {
            state.lastResultLayerId = idMap.get(state.lastResultLayerId);
        }
        if (state.layerId && idMap.has(state.layerId)) {
            state.layerId = idMap.get(state.layerId);
        }
    }
}

/**
 * @returns {{ type: string, open: boolean, state: object }[]}
 */
export function getWidgetsToRestore() {
    return activeWidgets.filter((entry) => entry.open);
}

export function clearWidgetStore() {
    activeWidgets = [];
}

/**
 * @param {string} type
 * @param {import('./widget-types.js').WidgetContext} ctx
 */
export async function restoreOpenWidget(type, ctx) {
    const { openWidget } = await import('./registry.js');
    const entry = getWidgetEntry(type);
    if (!entry?.open) return;
    openWidget(type, ctx, { restoreState: entry.state });
}
