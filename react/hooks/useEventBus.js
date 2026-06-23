import { useEffect, useState } from 'react';
import bus from '../../js/core/event-bus.js';

/**
 * Subscribe to an event-bus channel; re-renders when the event fires.
 * @param {string} event
 * @param {(payload: unknown) => void} [onEvent]
 */
export function useEventBus(event, onEvent) {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const handler = (payload) => {
            onEvent?.(payload);
            setTick((n) => n + 1);
        };
        bus.on(event, handler);
        return () => bus.off(event, handler);
    }, [event, onEvent]);

    return tick;
}
