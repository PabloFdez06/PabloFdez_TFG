import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function ArrowRightIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" {...props}>
            <path d="M2 7.5h11M9 3.5l4 4-4 4" />
        </svg>
    );
}

export function ArrowDownIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
            <path d="M7 2v10M3 8l4 4 4-4" />
        </svg>
    );
}

export function LockIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
    );
}

export function BooksIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
    );
}

export function PulseIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}

export function AlertIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
    );
}

export function CalendarIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

export function MessageIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
    );
}

export function HomeIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 20 20" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
            <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        </svg>
    );
}

export function GridIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 20 20" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
            <rect x="3" y="3" width="6" height="6" />
            <rect x="11" y="3" width="6" height="6" />
            <rect x="3" y="11" width="6" height="6" />
            <rect x="11" y="11" width="6" height="6" />
        </svg>
    );
}

export function BellIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 20 20" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
            <path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 5H2.5S4 11.5 4 8a6 6 0 016-6z" />
            <path d="M8.5 17a1.5 1.5 0 003 0" />
        </svg>
    );
}

export function UserIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 20 20" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
            <circle cx="10" cy="7" r="3" />
            <path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
    );
}

export function AppleIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.16-2.18 1.28-2.16 3.83.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.75" />
            <path d="M13 3.5a4 4 0 01-2.96 1.34A4.03 4.03 0 0113.5 1a4 4 0 01-.5 2.5z" />
        </svg>
    );
}

export function PlayIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
    );
}
