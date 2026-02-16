import React from 'react';
import { components } from '../../utils/designSystem';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  small?: boolean;
}

export const Input: React.FC<InputProps> = ({
  error = false,
  small = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = components.input.base;
  const errorClasses = error ? components.input.error : '';
  const disabledClasses = disabled ? components.input.disabled : '';
  const sizeClasses = small ? components.input.small : '';

  return (
    <input
      className={`${baseClasses} ${errorClasses} ${disabledClasses} ${sizeClasses} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
};
