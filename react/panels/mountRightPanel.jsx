import { createRoot } from 'react-dom/client';
import { RightPanel } from './RightPanel.jsx';

export function mountRightPanel({
    element,
    getSnapshot,
    actions,
    onStyleChange
}) {
    if (!element) {
        throw new Error('mountRightPanel: target element is required');
    }
    if (typeof getSnapshot !== 'function') {
        throw new Error('mountRightPanel: getSnapshot is required');
    }


    const root = createRoot(element);

    const render = () => {
        const snapshot = getSnapshot() || {};
        root.render(
            <RightPanel
                snapshot={snapshot}
                onToggleAgol={actions?.toggleAgol}
                onExport={actions?.doExport}
                onFixAgol={actions?.fixAgol}
                onShowDataTable={actions?.showDataTable}
                onStyleChange={onStyleChange}
            />
        );
    };

    const unmount = () => root.unmount();

    return { render, unmount };
}
