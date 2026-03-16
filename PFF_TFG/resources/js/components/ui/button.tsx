import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant =
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const variantClassMap: Record<ButtonVariant, string> = {
    default: 'c-button--primary',
    destructive: 'c-button--danger',
    outline: 'c-button--outline',
    secondary: 'c-button--secondary',
    ghost: 'c-button--ghost',
    link: 'c-button--link',
};

const sizeClassMap: Record<ButtonSize, string> = {
    default: 'c-button--md',
    sm: 'c-button--sm',
    lg: 'c-button--lg',
    icon: 'c-button--icon',
};

function Button({
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    ...props
}: React.ComponentProps<'button'> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    asChild?: boolean;
}) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            className={cn(
                'c-button',
                variantClassMap[variant],
                sizeClassMap[size],
                className,
            )}
            {...props}
        />
    );
}

export { Button };
