import { showModal } from './modals.js';

/**
 * Open a map GIS tool in the docked modal pipeline (right panel or dual-screen center).
 * @param {string} title
 * @param {string} rootId
 * @param {{ width?: string, onMount?: (overlay: Element, close: (result?: unknown) => void) => void }} [options]
 */
export function openToolDialog(title, rootId, { width = '480px', onMount } = {}) {
    return showModal(title, `<div id="${rootId}"></div>`, {
        width,
        docked: true,
        onMount
    });
}
