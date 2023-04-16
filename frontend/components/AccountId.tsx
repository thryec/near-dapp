import React from 'react';

export const AccountId: React.FC<
  React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>
> = ({ children, className, ...props }) => {
  return (
    <span
      className={'bg-slate-600/25 font-mono text-sm rounded p-1 ' + className}
      {...props}
    >
      {children}
    </span>
  );
};
