import { mountIsland } from '../mountIsland.jsx';
import { CrsConfirmDialog } from './CrsConfirmDialog.jsx';

export function mountCrsConfirmDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountCrsConfirmDialog: target element is required');
    }
    return { unmount: mountIsland(element, CrsConfirmDialog, props) };
}

/**
 * Prompt user to confirm source CRS for a projected import.
 * @param {{ layerName?: string, message?: string, defaultCrs?: string }} options
 * @returns {Promise<string|null>}
 */
export async function pickCrsConfirmModal(options = {}) {
    const { showModal } = await import('../../js/ui/modals.js');
    const rootId = `crs-confirm-${Date.now()}`;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (crs) => {
            if (settled) return;
            settled = true;
            resolve(crs);
        };

        showModal('Confirm coordinate system', `<div id="${rootId}"></div>`, {
            width: '480px',
            onMount: async (overlay, close) => {
                const root = overlay.querySelector(`#${rootId}`);
                if (!root) {
                    finish(null);
                    close(null);
                    return;
                }
                let mounted = null;
                const dismiss = (crs) => {
                    mounted?.unmount?.();
                    finish(crs);
                    close(crs != null);
                };

                mounted = mountCrsConfirmDialog(root, {
                    layerName: options.layerName,
                    message: options.message,
                    defaultCrs: options.defaultCrs || 'EPSG:6337',
                    onCancel: () => dismiss(null),
                    onConfirm: (crs) => dismiss(crs)
                });
            }
        });
    });
}
