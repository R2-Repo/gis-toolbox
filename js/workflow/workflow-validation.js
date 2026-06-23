/**
 * Pre-run validation helpers for the workflow engine.
 */

/** @returns {{ node: import('./nodes/node-base.js').NodeBase, message: string }[]} */
export function collectInvalidNodes(engine) {
    const invalid = [];
    for (const node of engine.nodes.values()) {
        const validation = node.validate?.() || { valid: true, message: '' };
        if (!validation.valid) {
            invalid.push({ node, message: validation.message || 'Invalid configuration' });
        }
    }
    return invalid;
}

/** @returns {boolean} true if pipeline is valid and can run */
export function validatePipelineBeforeRun(engine) {
    return collectInvalidNodes(engine).length === 0;
}
