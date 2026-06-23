/**
 * Unified pre-import guard — size checks and memory budget before heavy parse work.
 */
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { preflightFiles } from './import-preflight.js';
import {
    checkEstimatedMemoryBudget,
    checkExistingLayerMemory,
    IMPORT_GUARD_VERSION
} from './import-memory-budget.js';

/**
 * @param {File[]} files
 * @param {{ getLayers?: () => Array, source?: string, skipMemoryBudget?: boolean }} [options]
 * @returns {Promise<{ cancelled: boolean, check: ReturnType<typeof preflightFiles>, guardVersion: string }>}
 */
export async function guardFilesBeforeImport(files, options = {}) {
    const check = preflightFiles(files);

    if (check.reject) {
        throw new AppError(
            check.messages.join(' '),
            ErrorCategory.OUT_OF_MEMORY,
            { files: check.files, source: options.source, guardVersion: IMPORT_GUARD_VERSION }
        );
    }

    const layerBudget = checkExistingLayerMemory(options.getLayers);
    if (!layerBudget.ok) {
        throw new AppError(
            layerBudget.message,
            ErrorCategory.OUT_OF_MEMORY,
            { source: options.source, guardVersion: IMPORT_GUARD_VERSION }
        );
    }

    if (!options.skipMemoryBudget) {
        const budget = await checkEstimatedMemoryBudget(files);
        if (!budget.ok) {
            throw new AppError(
                budget.message,
                ErrorCategory.OUT_OF_MEMORY,
                { files: check.files, source: options.source, guardVersion: IMPORT_GUARD_VERSION }
            );
        }
    }

    return { cancelled: false, check, guardVersion: IMPORT_GUARD_VERSION };
}

export default { guardFilesBeforeImport };
