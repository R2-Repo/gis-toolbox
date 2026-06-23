import { useCallback, useEffect, useRef, useState } from 'react';

export function CollapsibleSection({
    title,
    children,
    defaultOpen = true,
    expandWhen = false,
    className = '',
    bodyClassName = '',
    bodyId = null
}) {
    const [collapsed, setCollapsed] = useState(!defaultOpen);
    const prevExpandWhen = useRef(expandWhen);

    useEffect(() => {
        if (expandWhen && !prevExpandWhen.current) {
            setCollapsed(false);
        }
        prevExpandWhen.current = expandWhen;
    }, [expandWhen]);

    const toggle = useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []);

    const onKeyDown = useCallback((event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggle();
    }, [toggle]);

    return (
        <div className={`panel-section${className ? ` ${className}` : ''}`}>
            <div
                className={`panel-section-header${collapsed ? ' collapsed' : ''}`}
                data-collapsible="true"
                role="button"
                tabIndex={0}
                onClick={toggle}
                onKeyDown={onKeyDown}
            >
                <span>{title}</span>
                <span className="arrow">▼</span>
            </div>
            <div
                id={bodyId || undefined}
                className={`panel-section-body${collapsed ? ' hidden' : ''}${bodyClassName ? ` ${bodyClassName}` : ''}`}
            >
                {children}
            </div>
        </div>
    );
}
