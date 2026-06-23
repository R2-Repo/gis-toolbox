/**
 * Inline warning / plan text for import dialogs (no extra modals or toasts).
 */
export function ImportReductionNotice({
    heading,
    intro,
    planIntro,
    bullets = [],
    footer = null,
    variant = 'warning'
}) {
    if (!heading && !intro) return null;

    const color = variant === 'danger' ? 'var(--danger)' : 'var(--warning, orange)';

    return (
        <div
            className="info-box text-xs mb-8 import-reduction-notice"
            style={{ color, borderColor: color }}
        >
            {heading ? (
                <div style={{ fontWeight: 600, marginBottom: intro || planIntro ? 6 : 0 }}>
                    {heading}
                </div>
            ) : null}
            {intro ? <p style={{ margin: '0 0 8px', lineHeight: 1.45 }}>{intro}</p> : null}
            {planIntro ? (
                <p style={{ margin: '0 0 6px', lineHeight: 1.45 }}>{planIntro}</p>
            ) : null}
            {bullets?.length ? (
                <ul style={{ margin: '0 0 8px', paddingLeft: 18, lineHeight: 1.45 }}>
                    {bullets.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            ) : null}
            {footer ? (
                <p style={{ margin: 0, lineHeight: 1.45, opacity: 0.95 }}>{footer}</p>
            ) : null}
        </div>
    );
}
