const DRAW_TOOLS = [
    {
        tool: 'select',
        title: 'Select & edit feature',
        label: 'Select',
        icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 1l5 14 1.5-5.5L14 8 2 1z" fill="currentColor" /></svg>
    },
    {
        tool: 'point',
        title: 'Draw point',
        label: 'Point',
        icon: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="currentColor" /></svg>
    },
    {
        tool: 'line',
        title: 'Draw line',
        label: 'Line',
        icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 14L14 2" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
    },
    {
        tool: 'polygon',
        title: 'Draw polygon',
        label: 'Polygon',
        icon: <svg width="16" height="16" viewBox="0 0 16 16"><polygon points="8,1 15,12 1,12" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" /></svg>
    },
    {
        tool: 'rectangle',
        title: 'Rectangle (click and drag on the map)',
        label: 'Rect',
        icon: <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" rx="1" /></svg>
    },
    {
        tool: 'circle',
        title: 'Draw circle',
        label: 'Circle',
        icon: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" /></svg>
    },
    {
        tool: 'sector',
        title: 'Draw sector (pie wedge)',
        label: 'Sector',
        icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 8L14 8A6 6 0 0 0 8 2Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" /></svg>
    }
];

export function DrawToolbar({
    layerName = '',
    activeTool = null,
    hint = '',
    showFinish = false,
    showUndo = false,
    showDelete = false,
    onClose,
    onToggleTool,
    onUndo,
    onDelete,
    onFinish
}) {
    const stopPropagation = (event) => event.stopPropagation();

    return (
        <div
            className="draw-toolbar"
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onMouseDown={stopPropagation}
        >
            <div className="draw-toolbar-header">
                <span className="draw-toolbar-title">✏️ Draw: <strong>{layerName}</strong></span>
                <button className="draw-toolbar-close" title="Close draw tools" onClick={() => onClose?.()}>✕</button>
            </div>
            <div className="draw-toolbar-tools">
                {DRAW_TOOLS.map((item) => (
                    <button
                        key={item.tool}
                        className={`draw-tool-btn${activeTool === item.tool ? ' active' : ''}`}
                        data-tool={item.tool}
                        title={item.title}
                        onClick={() => onToggleTool?.(item.tool)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
            <div className="draw-toolbar-actions">
                <button
                    className="draw-action-btn draw-undo-btn"
                    style={{ display: showUndo ? '' : 'none' }}
                    title="Undo last vertex (Right-click)"
                    onClick={() => onUndo?.()}
                >
                    ↩ Undo
                </button>
                <button
                    className="draw-action-btn draw-delete-btn"
                    style={{ display: showDelete ? '' : 'none' }}
                    title="Delete selected feature"
                    onClick={() => onDelete?.()}
                >
                    🗑 Delete
                </button>
            </div>
            <div className="draw-toolbar-hint">{hint}</div>
            <button
                className="draw-finish-btn"
                style={{ display: showFinish ? '' : 'none' }}
                onClick={() => onFinish?.()}
            >
                ✓ Finish
            </button>
        </div>
    );
}
