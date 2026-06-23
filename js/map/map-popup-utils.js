/**
 * Scroll helpers for MapLibre feature popups.
 * @param {{ getElement?: () => HTMLElement | null } | null | undefined} popup
 */
export function resetMapPopupScroll(popup) {
    const root = popup?.getElement?.();
    if (!root) return;
    const attrs = root.querySelector('.map-popup-attributes');
    if (attrs) attrs.scrollTop = 0;
    const content = root.querySelector('.maplibregl-popup-content');
    if (content) content.scrollTop = 0;
}
