/**
 * Global keyboard shortcuts for map feature selection.
 * Skips when focus is in inputs or a modal is open.
 */

function isEditableTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function isModalOpen() {
    return !!document.querySelector('.modal-overlay:not(.hidden), .modal-backdrop:not(.hidden), [data-modal-open="true"]');
}

/**
 * @param {object} actions
 * @param {() => void} [actions.clearSelection]
 * @param {() => void} [actions.selectAllFeatures]
 * @param {() => void} [actions.invertSelection]
 * @param {() => void} [actions.deleteSelectedFeatures]
 * @param {() => number} [actions.getSelectionCount]
 * @param {() => boolean} [actions.isDrawToolActive]
 */
export function initSelectionShortcuts(actions = {}) {
    const handler = (e) => {
        if (isEditableTarget(e.target) || isModalOpen()) return;

        if (actions.isDrawToolActive?.()) return;

        if (e.key === 'Escape') {
            if ((actions.getSelectionCount?.() ?? 0) > 0) {
                e.preventDefault?.();
                actions.clearSelection?.();
            }
            return;
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && (actions.getSelectionCount?.() ?? 0) > 0) {
            e.preventDefault?.();
            actions.deleteSelectedFeatures?.();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault?.();
            if (e.shiftKey) {
                actions.invertSelection?.();
            } else {
                actions.selectAllFeatures?.();
            }
        }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
}

export default initSelectionShortcuts;
