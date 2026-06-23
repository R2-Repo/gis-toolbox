import { GIS_WIDGETS } from '../../js/widgets/registry.js';

export function WidgetPanel() {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {GIS_WIDGETS.map((widget) => (
                <span key={widget.type} className="geo-tool-btn">
                    <button type="button" className="btn btn-sm btn-secondary" data-app-action={widget.action}>
                        {widget.icon} {widget.label}
                    </button>
                    <span className="geo-tip">{widget.tip}</span>
                </span>
            ))}
        </div>
    );
}
