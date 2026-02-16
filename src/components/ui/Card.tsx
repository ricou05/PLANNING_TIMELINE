import React from 'react';
import { components } from '../../utils/designSystem';

interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  hoverable?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  padded = true,
  hoverable = false,
  className = '',
}) => {
  const baseClasses = components.card.base;
  const paddedClasses = padded ? components.card.padded : '';
  const hoverClasses = hoverable ? components.card.hover : '';

  return (
    <div className={`${baseClasses} ${paddedClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
};
