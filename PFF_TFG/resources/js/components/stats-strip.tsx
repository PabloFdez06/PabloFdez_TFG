type StatsStripItem = {
    label: string;
    value: string | number;
    highlight?: boolean;
};

type StatsStripProps = {
    items: StatsStripItem[];
    className?: string;
    ariaLabel: string;
};

export default function StatsStrip({ items, className, ariaLabel }: StatsStripProps) {
    const classes = className ? `c-stats-strip ${className}` : 'c-stats-strip';

    return (
        <section className={classes} aria-label={ariaLabel}>
            {items.map((item) => (
                <article key={item.label} className={item.highlight ? 'is-highlight' : ''}>
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                </article>
            ))}
        </section>
    );
}
