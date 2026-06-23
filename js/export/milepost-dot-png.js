/** 16×16 bright green (#00ff66) dot PNG for KMZ milepost icons. */
export const MILEPOST_DOT_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC8SURBVDhPzZIhEsJADEUjK5EcoRKJ5AjcYCt20w4KiazjCEiOwRE4ChKJS5h0h06T7OwgELyZr/pfmmkK8N8wtsD9Djhu7KM6HDsgfAIjzyF8AePJVj2Ubkq0IbwDh8ZqGYqDE0qhdLZqJq/phWIOay3Lh3KlavZ6wLfrz0mjHjCdy5ZqiZ0ZEBpfqqbVAwTqL4Wij5y6iGxB6eEEJcsPZi+whMMKCK9O/Ly5Ki+Rs06XSSMQHoHi1lZ+whsWACO+54yZFgAAAABJRU5ErkJggg==';

/** @returns {Uint8Array} */
export function getMilepostDotBytes() {
    if (typeof Buffer !== 'undefined') {
        return Uint8Array.from(Buffer.from(MILEPOST_DOT_PNG_BASE64, 'base64'));
    }
    const binary = atob(MILEPOST_DOT_PNG_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
