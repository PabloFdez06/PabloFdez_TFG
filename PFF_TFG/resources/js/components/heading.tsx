export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    return (
        <header className={variant === 'small' ? '' : ''}>
            <h2
                className={
                    variant === 'small'
                        ? ''
                        : ''
                }
            >
                {title}
            </h2>
            {description && (
                <p className="">{description}</p>
            )}
        </header>
    );
}
