import { createRoot } from 'react-dom/client';
import { SmartStylePanel } from './SmartStylePanel.jsx';

export function mountSmartStylePanel(element, props) {
    if (!element) throw new Error('mountSmartStylePanel: element required');
    const root = createRoot(element);
    root.render(<SmartStylePanel {...props} />);
    return {
        unmount: () => root.unmount(),
        render: (nextProps) => root.render(<SmartStylePanel {...nextProps} />)
    };
}
