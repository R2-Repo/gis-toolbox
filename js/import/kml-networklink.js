/**
 * NetworkLink helpers — detect & optionally merge linked KML (best effort; CORS often blocks).
 */
import { AppError, ErrorCategory } from '../core/error-handler.js';
import { analyzeSchema, explodeGeometryCollectionsInFeatureCollection } from '../core/data-model.js';
import { loadToGeoJSON } from '../core/libs.js';

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Collect unique href strings from NetworkLink / Link / href (DOM local names work with KML namespaces).
 * @param {Document} kmlDoc
 * @returns {string[]}
 */
export function collectNetworkLinkHrefs(kmlDoc) {
    const out = [];
    const seen = new Set();
    const networkLinks = kmlDoc.getElementsByTagName('NetworkLink');
    for (let i = 0; i < networkLinks.length; i++) {
        const nl = networkLinks[i];
        const links = nl.getElementsByTagName('Link');
        for (let j = 0; j < links.length; j++) {
            const link = links[j];
            const hrefEls = link.getElementsByTagName('href');
            for (let k = 0; k < hrefEls.length; k++) {
                const t = hrefEls[k].textContent?.trim();
                if (!t || seen.has(t)) continue;
                seen.add(t);
                out.push(t);
            }
        }
    }
    return out;
}

/**
 * Fetch with timeout and response body size cap.
 * @param {string} url
 * @param {{ timeoutMs?: number, maxBytes?: number }} opts
 */
export async function fetchKmlWithLimits(url, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
        res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', redirect: 'follow' });
    } finally {
        clearTimeout(timer);
    }
    if (!res.ok) {
        throw new AppError(`HTTP ${res.status} for ${url}`, ErrorCategory.HTTP_4XX, { status: res.status });
    }
    const reader = res.body?.getReader();
    if (!reader) {
        const text = await res.text();
        if (text.length > maxBytes) {
            throw new AppError('Linked file exceeds size limit', ErrorCategory.PARSE_FAILED, { maxBytes });
        }
        return text;
    }
    const chunks = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            total += value.byteLength;
            if (total > maxBytes) {
                reader.cancel().catch(() => {});
                throw new AppError('Linked file exceeds size limit', ErrorCategory.PARSE_FAILED, { maxBytes });
            }
            chunks.push(value);
        }
    }
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
        buf.set(c, off);
        off += c.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

function _featuresFromKmlText(kmlText, toGeoJsonLib) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlText, 'text/xml');
    const pe = doc.querySelector('parsererror');
    if (pe) throw new AppError('Invalid linked KML/XML', ErrorCategory.PARSE_FAILED);
    if (!toGeoJsonLib?.kml) {
        throw new AppError('toGeoJSON library not loaded', ErrorCategory.PARSE_FAILED);
    }
    const gj = toGeoJsonLib.kml(doc);
    return gj?.features || [];
}

/**
 * Fetch each http(s) NetworkLink href and merge features into the dataset.
 * Relative hrefs are reported in skippedRelative (resolve inside KMZ separately).
 * @param {object} dataset - spatial dataset (mutated)
 * @param {string[]} hrefs
 * @param {import('../core/task-runner.js').TaskRunner} [task]
 */
export async function mergeNetworkLinksIntoDataset(dataset, hrefs, task) {
    // Ensure toGeoJSON is available via bootstrapGlobals or dynamic import.
    const toGeoJsonLib = await loadToGeoJSON();

    const initialLen = dataset.geojson?.features?.length || 0;
    const merged = [...(dataset.geojson?.features || [])];
    const failures = [];
    const skippedRelative = [];
    const absoluteHrefs = [];
    const relativeHrefs = [];

    for (const h of hrefs) {
        const t = h.trim();
        if (/^https?:\/\//i.test(t)) absoluteHrefs.push(t);
        else relativeHrefs.push(t);
    }

    const kmzResolver = dataset._kmzLinkResolver;
    const allHrefs = [
        ...relativeHrefs.map((href) => ({ href, source: 'relative' })),
        ...absoluteHrefs.map((href) => ({ href, source: 'remote' }))
    ];

    let idx = 0;
    for (const { href, source } of allHrefs) {
        idx++;
        task?.updateProgress(
            10 + Math.round((idx / Math.max(allHrefs.length, 1)) * 80),
            source === 'relative'
                ? `Reading in-archive link ${idx}/${allHrefs.length}…`
                : `Fetching network link ${idx}/${allHrefs.length}…`
        );
        try {
            let text;
            if (source === 'relative') {
                if (!kmzResolver) {
                    skippedRelative.push(href);
                    continue;
                }
                text = await kmzResolver(href);
                if (!text) {
                    skippedRelative.push(href);
                    continue;
                }
            } else {
                text = await fetchKmlWithLimits(href);
            }
            const feats = _featuresFromKmlText(text, toGeoJsonLib);
            for (const f of feats) {
                const props = { ...(f.properties || {}), _networkLinkHref: href };
                merged.push({ ...f, properties: props });
            }
        } catch (e) {
            failures.push({ href, reason: e?.message || String(e) });
        }
    }

    const fc = explodeGeometryCollectionsInFeatureCollection({ type: 'FeatureCollection', features: merged });
    dataset.geojson = fc;
    dataset.schema = analyzeSchema(fc);
    delete dataset._networkLinkHrefs;
    delete dataset._importWarning;

    return { failures, skippedRelative, addedFeatures: merged.length - initialLen, totalFeatures: merged.length };
}
