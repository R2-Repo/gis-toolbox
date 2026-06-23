import { mountIsland } from '../mountIsland.jsx';
import { ExportCrsDialog } from './ExportCrsDialog.jsx';

export function mountExportCrsDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountExportCrsDialog: target element is required');
    }
    return { unmount: mountIsland(element, ExportCrsDialog, props) };
}

/**
 * @param {{ layerName?: string, defaultCrs?: string }} options
 * @returns {Promise<{ targetCrs: string }|null>}
 */
export async function pickExportCrsModal(options = {}) {
    const { showModal } = await import('../../js/ui/modals.js');
    const rootId = `export-crs-${Date.now()}`;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        showModal('Export coordinate system', `<div id="${rootId}"></div>`, {
            width: '480px',
            onMount: async (overlay, close) => {
                const root = overlay.querySelector(`#${rootId}`);
                if (!root) {
                    finish(null);
                    close(null);
                    return;
                }
                let mounted = null;
                const dismiss = (result) => {
                    mounted?.unmount?.();
                    finish(result);
                    close(result != null);
                };

                mounted = mountExportCrsDialog(root, {
                    layerName: options.layerName,
                    defaultCrs: options.defaultCrs || 'EPSG:4326',
                    onCancel: () => dismiss(null),
                    onConfirm: (result) => dismiss(result)
                });
            }
        });
    });
}
