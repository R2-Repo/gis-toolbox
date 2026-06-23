export function DrawLayerChooserDialog({ options = [], onChoose }) {
    return (
        <div className="draw-options">
            {options.map((option) => (
                <button
                    key={option.action}
                    className="draw-option-btn"
                    onClick={() => onChoose?.(option.action)}
                >
                    <span style={{ fontSize: '18px' }}>{option.icon}</span>
                    <div>
                        <strong>{option.label}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{option.desc}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}
