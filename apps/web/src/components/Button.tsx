import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function Button({ loading = false, disabled, children, ...rest }: ButtonProps) {
  return (
    <button type="button" disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : children}
    </button>
  );
}
