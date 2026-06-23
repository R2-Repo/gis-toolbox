import { createRoot } from 'react-dom/client';
import { DrawToolbar } from './DrawToolbar.jsx';

export function mountDrawToolbar(element, props = {}) {
    if (!element) {
        throw new Error('mountDrawToolbar: target element is required');
    }


    const root = createRoot(element);
    root.render(<DrawToolbar {...props} />);

    return {
        update(nextProps = {}) {
            root.render(<DrawToolbar {...nextProps} />);
        },
        unmount() {
            root.unmount();
        }
    };
}
