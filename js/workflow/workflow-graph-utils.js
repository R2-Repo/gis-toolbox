/**
 * Graph shape helpers for workflow UI (Steps view, linear detection).
 */

/**
 * Returns true when the graph is a simple left-to-right pipeline:
 * - exactly one node with no incoming wires (start)
 * - each other node has at most one incoming wire
 * - each non-terminal node has at most one outgoing wire to a non-output sibling
 *   (fan-out to preview + add-to-map from the same parent is allowed)
 */
export function isLinearPipeline(engine) {
    if (!engine?.nodes?.size) return false;

    const nodes = [...engine.nodes.values()];
    const wires = engine.wires || [];

    const incomingCount = new Map();
    const outgoingCount = new Map();
    for (const id of engine.nodes.keys()) {
        incomingCount.set(id, 0);
        outgoingCount.set(id, 0);
    }
    for (const w of wires) {
        if (!engine.nodes.has(w.from) || !engine.nodes.has(w.to)) continue;
        outgoingCount.set(w.from, (outgoingCount.get(w.from) || 0) + 1);
        incomingCount.set(w.to, (incomingCount.get(w.to) || 0) + 1);
    }

    const starts = nodes.filter((n) => (incomingCount.get(n.id) || 0) === 0);
    if (starts.length !== 1) return false;

    for (const node of nodes) {
        const inc = incomingCount.get(node.id) || 0;
        const out = outgoingCount.get(node.id) || 0;
        if (inc > 1) return false;
        if (out > 2) return false;
        if (out === 2) {
            const outs = wires.filter((w) => w.from === node.id);
            const targets = outs.map((w) => engine.nodes.get(w.to)).filter(Boolean);
            const allOutputs = targets.every((t) => t.type === 'preview' || t.type === 'add-to-map');
            if (!allOutputs) return false;
        }
    }

    return true;
}

/**
 * Ordered node list for linear pipelines (topo sort). Returns null if not linear.
 * @returns {import('./nodes/node-base.js').NodeBase[] | null}
 */
export function getLinearStepOrder(engine) {
    if (!isLinearPipeline(engine)) return null;

    try {
        const order = engine._topoSort?.() ?? _topoSortFallback(engine);
        return order.map((id) => engine.nodes.get(id)).filter(Boolean);
    } catch {
        return null;
    }
}

function _topoSortFallback(engine) {
    const inDeg = new Map();
    const adj = new Map();
    for (const id of engine.nodes.keys()) {
        inDeg.set(id, 0);
        adj.set(id, []);
    }
    for (const w of engine.wires) {
        if (!engine.nodes.has(w.from) || !engine.nodes.has(w.to)) continue;
        adj.get(w.from).push(w.to);
        inDeg.set(w.to, (inDeg.get(w.to) || 0) + 1);
    }
    const queue = [];
    for (const [id, deg] of inDeg) {
        if (deg === 0) queue.push(id);
    }
    const sorted = [];
    while (queue.length) {
        const id = queue.shift();
        sorted.push(id);
        for (const next of adj.get(id)) {
            inDeg.set(next, inDeg.get(next) - 1);
            if (inDeg.get(next) === 0) queue.push(next);
        }
    }
    if (sorted.length !== engine.nodes.size) throw new Error('Cycle');
    return sorted;
}
