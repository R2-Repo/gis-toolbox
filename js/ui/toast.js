/**
 * Toast notification system
 */

const DEDUPE_MS = 2000;
const MAX_VISIBLE_TOASTS = 3;

const DEFAULT_DURATIONS = {
    info: 3000,
    success: 3000,
    warning: 5000,
    warn: 5000,
    error: 8000
};

const _subscribers = new Set();
let _nextToastId = 1;

/** @type {Map<string, { id: number, remove: () => void, timer: ReturnType<typeof setTimeout> | null, lastShown: number }>} */
const _activeByKey = new Map();

function _emitToastEvent(event) {
    _subscribers.forEach((listener) => {
        try {
            listener(event);
        } catch {
            // Keep toast delivery resilient if a subscriber errors.
        }
    });
}

function _toastKey(message, type) {
    return `${type}::${String(message)}`;
}

function _defaultDuration(type, options = {}) {
    if (options.duration != null) return options.duration;
    return DEFAULT_DURATIONS[type] ?? DEFAULT_DURATIONS.info;
}

function _buildToastPayload(message, type, options = {}) {
    return {
        id: _nextToastId++,
        message,
        type,
        details: options.details || null,
        duration: _defaultDuration(type, options)
    };
}

function _cleanupActive(key, id) {
    const entry = _activeByKey.get(key);
    if (entry && entry.id === id) {
        if (entry.timer) clearTimeout(entry.timer);
        _activeByKey.delete(key);
    }
}

function _scheduleRemove(key, id, remove, duration) {
    const entry = _activeByKey.get(key);
    if (!entry || entry.id !== id) return;
    if (entry.timer) clearTimeout(entry.timer);
    if (duration > 0) {
        entry.timer = setTimeout(remove, duration);
    } else {
        entry.timer = null;
    }
}

export function subscribeToasts(listener) {
    if (typeof listener !== 'function') {
        throw new Error('subscribeToasts requires a listener function');
    }
    _subscribers.add(listener);
    return () => _subscribers.delete(listener);
}

export function dismissToast(id) {
    if (id == null) return;
    for (const [key, entry] of _activeByKey.entries()) {
        if (entry.id === id) {
            if (entry.timer) clearTimeout(entry.timer);
            _activeByKey.delete(key);
            break;
        }
    }
    _emitToastEvent({ type: 'remove', id });
}

export function showToast(message, type = 'info', options = {}) {
    const duration = _defaultDuration(type, options);
    const key = _toastKey(message, type);
    const now = Date.now();
    const existing = _activeByKey.get(key);

    if (existing && now - existing.lastShown < DEDUPE_MS) {
        existing.lastShown = now;
        _scheduleRemove(key, existing.id, existing.remove, duration);
        return { id: existing.id, remove: existing.remove };
    }

    const payload = _buildToastPayload(message, type, { ...options, duration });
    let removed = false;
    const remove = () => {
        if (removed) return;
        removed = true;
        _cleanupActive(key, payload.id);
        dismissToast(payload.id);
    };

    _activeByKey.set(key, {
        id: payload.id,
        remove,
        timer: null,
        lastShown: now
    });

    _emitToastEvent({ type: 'add', toast: payload });
    _scheduleRemove(key, payload.id, remove, duration);
    return { id: payload.id, remove };
}

/**
 * Show a user-friendly error with guidance
 */
export function showErrorToast(errorInfo) {
    const msg = `<strong>${errorInfo.title || 'Error'}</strong><br>${errorInfo.message}`;
    const details = [errorInfo.guidance, errorInfo.technical].filter(Boolean).join('<br><br>');
    return showToast(msg, 'error', { details, duration: 8000 });
}

export { MAX_VISIBLE_TOASTS, DEFAULT_DURATIONS, DEDUPE_MS };

export default { showToast, showErrorToast };
