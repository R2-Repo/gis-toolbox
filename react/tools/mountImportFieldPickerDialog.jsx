import { mountIsland } from '../mountIsland.jsx';
import { ImportFieldPickerDialog } from './ImportFieldPickerDialog.jsx';

export function mountImportFieldPickerDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountImportFieldPickerDialog: target element is required');
    }
    return { unmount: mountIsland(element, ImportFieldPickerDialog, props) };
}

/**
 * Modal field picker — returns selected field names or null if cancelled.
 * When `onImport` is provided, Continue keeps the modal open with progress until import finishes.
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   planNotice?: object|null,
 *   fields: string[],
 *   onImport?: (fields: string[], ui: { onProgress, onCancelReady, close }) => Promise<void>
 * }} options
 * @returns {Promise<string[]|null>}
 */
export async function pickImportFieldsModal(options) {
    const { showModal } = await import('../../js/ui/modals.js');
    const rootId = `import-field-pick-${Date.now()}`;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (fields) => {
            if (settled) return;
            settled = true;
            resolve(fields);
        };

        showModal(options.title || 'Choose attributes to import', `<div id="${rootId}"></div>`, {
            width: '520px',
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

                mounted = mountImportFieldPickerDialog(root, {
                    title: options.title,
                    subtitle: options.subtitle,
                    planNotice: options.planNotice || null,
                    fields: options.fields || [],
                    onCancel: () => dismiss(null),
                    onConfirm: (selectedFields) => dismiss(selectedFields),
                    onImport: options.onImport
                        ? async (selectedFields, ui) => {
                            await options.onImport(selectedFields, {
                                ...ui,
                                close: () => dismiss(selectedFields)
                            });
                        }
                        : null
                });
            }
        });
    });
}
