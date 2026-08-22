import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  padding,
  className = '',
  style,
  ...props
}) => {
  const customStyle: React.CSSProperties = {
    ...(padding ? { padding } : {}),
    ...style,
  };

  return (
    <div
      className={`glass-card ${interactive ? 'interactive' : ''} ${className}`.trim()}
      style={customStyle}
      {...props}
    >
      {children}
    </div>
  );
};
