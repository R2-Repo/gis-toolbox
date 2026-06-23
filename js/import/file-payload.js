/**
 * Single-read file payloads for import — avoids duplicate file.text() / arrayBuffer().
 */
import { assertFileReadable, assertTextPayloadSize } from './import-memory-budget.js';

const TEXT_FORMATS = new Set(['geojson', 'json', 'csv', 'tsv', 'txt', 'kml', 'xml']);
const BUFFER_FORMATS = new Set(['zip', 'kmz', 'xlsx', 'xls']);

/**
 * @param {File} file
 * @param {string} format
 * @returns {Promise<{ kind: 'text', data: string } | { kind: 'buffer', data: ArrayBuffer } | null>}
 */
export async function readFilePayload(file, format) {
    assertFileReadable(file, format);

    if (TEXT_FORMATS.has(format)) {
        const data = await file.text();
        assertTextPayloadSize(data, file.name);
        return { kind: 'text', data };
    }
    if (BUFFER_FORMATS.has(format)) {
        return { kind: 'buffer', data: await file.arrayBuffer() };
    }
    return null;
}

export function formatUsesText(format) {
    return TEXT_FORMATS.has(format);
}

export function formatUsesBuffer(format) {
    return BUFFER_FORMATS.has(format);
}

export default { readFilePayload, formatUsesText, formatUsesBuffer };
