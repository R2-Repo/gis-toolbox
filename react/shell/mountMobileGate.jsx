import { createRoot } from 'react-dom/client';
import { MobileGate } from './MobileGate.jsx';

export function mountMobileGate(element) {
    if (!element) {
        throw new Error('mountMobileGate: target element is required');
    }

    const root = createRoot(element);
    root.render(<MobileGate />);

    return {
        unmount: () => root.unmount()
    };
}
