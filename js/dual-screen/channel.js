/**
 * Dual Screen Mode — BroadcastChannel transport
 */
import { CHANNEL_NAME, parseMessage } from './protocol.js';

export class DualScreenChannel {
    /**
     * @param {'primary'|'secondary'} role
     * @param {(msg: object) => void} onMessage
     */
    constructor(role, onMessage) {
        this.role = role;
        this._onMessage = onMessage;
        this._bc = typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel(CHANNEL_NAME)
            : null;
        this._closed = false;
        if (this._bc) {
            this._bc.onmessage = (ev) => {
                const msg = parseMessage(ev.data);
                if (msg) this._onMessage(msg);
            };
        }
    }

    get supported() {
        return !!this._bc;
    }

    post(message) {
        if (this._closed || !this._bc) return;
        try {
            this._bc.postMessage(message);
        } catch (err) {
            console.warn('[DualScreen] post failed', err);
        }
    }

    close() {
        this._closed = true;
        if (this._bc) {
            this._bc.close();
            this._bc = null;
        }
    }
}
