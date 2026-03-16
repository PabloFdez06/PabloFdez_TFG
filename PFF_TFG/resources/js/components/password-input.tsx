import { Eye, EyeOff } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function PasswordInput({
    className,
    ref,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & { ref?: Ref<HTMLInputElement> }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="c-password-input">
            <Input
                type={showPassword ? 'text' : 'password'}
                className={cn('c-password-input__control', className)}
                ref={ref}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="c-password-input__toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
            >
                {showPassword ? (
                    <EyeOff className="c-password-input__icon" />
                ) : (
                    <Eye className="c-password-input__icon" />
                )}
            </button>
        </div>
    );
}
