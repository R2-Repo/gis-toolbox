import React from 'react';

/**
 * Pipeline icon — hybrid of forked flow, ring nodes, and a branch junction.
 * Inspired by node-graph / workflow references (hollow nodes + split path).
 */
export function PipelineIcon({ className, size = 16, ...props }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            {...props}
        >
            {/* Source — rounded input (tree-style box, compact) */}
            <rect
                x="0.75"
                y="6.25"
                width="3.5"
                height="3.5"
                rx="0.75"
                stroke="currentColor"
                strokeWidth="1.25"
            />
            <path
                d="M4.25 8h1.35"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
            />
            {/* Junction hub — solid dot (molecule / branch point) */}
            <circle cx="7.25" cy="8" r="0.85" fill="currentColor" />
            {/* Fork — upper and lower branches to hollow ring outputs */}
            <path
                d="M8.1 8c1.1 0 1.35-2.35 2.65-2.55"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M8.1 8c1.1 0 1.35 2.35 2.65 2.55"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                fill="none"
            />
            <circle cx="12.25" cy="5.45" r="1.55" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="12.25" cy="10.55" r="1.55" stroke="currentColor" strokeWidth="1.25" />
        </svg>
    );
}
