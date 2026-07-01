import { createRoot } from 'react-dom/client';
import { TextAnnotationDialog } from './TextAnnotationDialog.jsx';

export function mountTextAnnotationDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountTextAnnotationDialog: target element is required');
    }

    const root = createRoot(element);
    root.render(<TextAnnotationDialog {...props} />);

    return {
        update(nextProps = {}) {
            root.render(<TextAnnotationDialog {...nextProps} />);
        },
        unmount() {
            root.unmount();
        }
    };
}
