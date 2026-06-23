export function ImportOptionCard({
    icon,
    title,
    description,
    active = false,
    badge = null,
    className = '',
    onClick,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop
}) {
    return (
        <button
            type="button"
            className={`import-option-card${active ? ' import-option-card--active' : ''}${className ? ` ${className}` : ''}`}
            onClick={onClick}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {badge ? <span className="import-option-card__badge">{badge}</span> : null}
            <span className="import-option-card__icon" aria-hidden="true">{icon}</span>
            <span className="import-option-card__title">{title}</span>
            <span className="import-option-card__desc">{description}</span>
        </button>
    );
}
