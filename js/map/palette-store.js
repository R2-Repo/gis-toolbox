/**
 * Persist user-defined color palette favorites (localStorage).
 */
const STORAGE_KEY = 'gis-toolbox-palette-favorites';

/**
 * @returns {Array<{ id: string, name: string, colors: string[] }>}
 */
export function loadPaletteFavorites() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * @param {Array<{ id: string, name: string, colors: string[] }>} palettes
 */
export function savePaletteFavorites(palettes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
}

/**
 * @param {string} name
 * @param {string[]} colors
 */
export function addPaletteFavorite(name, colors) {
    const list = loadPaletteFavorites();
    list.push({
        id: `pal-${Date.now()}`,
        name,
        colors: [...colors]
    });
    savePaletteFavorites(list);
    return list;
}

/**
 * @param {string} id
 */
export function removePaletteFavorite(id) {
    const list = loadPaletteFavorites().filter((p) => p.id !== id);
    savePaletteFavorites(list);
    return list;
}
