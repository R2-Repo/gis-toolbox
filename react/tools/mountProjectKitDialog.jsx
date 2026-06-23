import { mountIsland } from '../mountIsland.jsx';
import { ExportProjectKitDialog, ImportProjectKitDialog } from './ProjectKitDialog.jsx';

export function mountExportProjectKitDialog(element, props = {}) {
    if (!element) throw new Error('mountExportProjectKitDialog: target element is required');
    return { unmount: mountIsland(element, ExportProjectKitDialog, props) };
}

export function mountImportProjectKitDialog(element, props = {}) {
    if (!element) throw new Error('mountImportProjectKitDialog: target element is required');
    return { unmount: mountIsland(element, ImportProjectKitDialog, props) };
}

/**
 * @param {{ defaultName?: string, layerCount?: number }} options
 */
export async function pickExportProjectKitModal(options = {}) {
    const { showModal } = await import('../../js/ui/modals.js');
    const rootId = `export-project-kit-${Date.now()}`;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        showModal('Toolbox Export', `<div id="${rootId}"></div>`, {
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
                mounted = mountExportProjectKitDialog(root, {
                    ...options,
                    onConfirm: (result) => dismiss(result),
                    onCancel: () => dismiss(null)
                });
            }
        });
    });
}

/**
 * @param {{ summary: object, availableSections?: string[] }} options
 */
export async function pickImportProjectKitModal(options = {}) {
    const { showModal } = await import('../../js/ui/modals.js');
    const rootId = `import-project-kit-${Date.now()}`;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        showModal('Import .gis-toolbox', `<div id="${rootId}"></div>`, {
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
                mounted = mountImportProjectKitDialog(root, {
                    ...options,
                    onConfirm: (result) => dismiss(result),
                    onCancel: () => dismiss(null)
                });
            }
        });
    });
}
