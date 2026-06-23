/**
 * Single-slot import parse worker pool with cancel via terminate.
 */
import logger from '../core/logger.js';

let worker = null;
let workersSupported = null;
let nextJobId = 1;
/** @type {Map<number, { resolve: Function, reject: Function }>} */
const pending = new Map();
let activeJobId = null;

export function supportsWorkers() {
    if (workersSupported != null) return workersSupported;
    try {
        workersSupported = typeof Worker !== 'undefined';
    } catch {
        workersSupported = false;
    }
    return workersSupported;
}

function ensureWorker() {
    if (!supportsWorkers()) return null;
    if (worker) return worker;

    try {
        worker = new Worker(
            new URL('../workers/import-parse.worker.js', import.meta.url),
            { type: 'module' }
        );
        worker.onmessage = (event) => {
            const { id, ok, result, error } = event.data || {};
            const job = pending.get(id);
            if (!job) return;
            pending.delete(id);
            if (activeJobId === id) activeJobId = null;
            if (ok) job.resolve(result);
            else job.reject(new Error(error || 'Worker parse failed'));
        };
        worker.onerror = (event) => {
            logger.warn('ImportWorker', 'Worker error', { message: event.message });
            for (const [, job] of pending) {
                job.reject(new Error(event.message || 'Worker crashed'));
            }
            pending.clear();
            activeJobId = null;
            worker = null;
        };
        return worker;
    } catch (e) {
        logger.warn('ImportWorker', 'Worker unavailable', { error: e.message });
        workersSupported = false;
        return null;
    }
}

/**
 * @param {'geojson'|'kml'|'kmz'|'shapefile'} op
 * @param {string|ArrayBuffer} payload
 * @param {{ transfer?: Transferable[] }} [options]
 */
export function parseInWorker(op, payload, options = {}) {
    const w = ensureWorker();
    if (!w) return Promise.resolve(null);

    const id = nextJobId++;
    activeJobId = id;

    return new Promise((resolve, reject) => {
        pending.set(id, {
            resolve: (result) => resolve(result),
            reject
        });

        const message = { id, op, payload };
        if (options.transfer?.length) {
            w.postMessage(message, options.transfer);
        } else {
            w.postMessage(message);
        }
    });
}

export function cancelWorkerParse() {
    if (!worker) return;
    for (const [, job] of pending) {
        job.reject(Object.assign(new Error('Operation cancelled'), { cancelled: true }));
    }
    pending.clear();
    activeJobId = null;
    try {
        worker.terminate();
    } catch {
        /* ignore */
    }
    worker = null;
}

export function isWorkerParseActive() {
    return activeJobId != null;
}

export default {
    parseInWorker,
    cancelWorkerParse,
    isWorkerParseActive,
    supportsWorkers
};
