/**
 * Dual Screen — open the secondary map window with a usable Window reference.
 *
 * A sized `windowFeatures` string encourages browsers to open a separate window
 * instead of a tab. Do not pass `noopener` or `noreferrer` in features — both
 * can cause window.open() to return null while the popup may still open.
 */

export const MAP_WINDOW_NAME = 'gis-toolbox-map';
export const MAP_WINDOW_PATH = 'map-window.html';

/**
 * Build window.open features for a dedicated map window (not a browser tab).
 * @param {Pick<Screen, 'availWidth' | 'availHeight' | 'availLeft' | 'availTop'>} [screenLike]
 * @returns {string}
 */
export function buildMapWindowFeatures(screenLike = globalThis.screen) {
    const availWidth = screenLike?.availWidth ?? 1280;
    const availHeight = screenLike?.availHeight ?? 800;
    const availLeft = screenLike?.availLeft ?? 0;
    const availTop = screenLike?.availTop ?? 0;
    const width = Math.min(1600, Math.max(800, availWidth - 48));
    const height = Math.min(960, Math.max(600, availHeight - 48));
    const left = Math.max(0, Math.round(availLeft + (availWidth - width) / 2));
    const top = Math.max(0, Math.round(availTop + (availHeight - height) / 2));

    return [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no',
        'resizable=yes',
        'scrollbars=no'
    ].join(',');
}

/**
 * @param {Window | null} win
 * @returns {boolean}
 */
export function isSecondaryMapWindowOpen(win) {
    return !!(win && !win.closed);
}

/**
 * Open (or reuse) the named map window in a separate browser window when possible.
 * @returns {Window | null}
 */
export function openSecondaryMapWindow() {
    const features = buildMapWindowFeatures();
    const win = window.open(MAP_WINDOW_PATH, MAP_WINDOW_NAME, features);
    if (win) {
        try {
            win.opener = null;
        } catch (_) { /* ignore */ }
    }
    return win;
}
