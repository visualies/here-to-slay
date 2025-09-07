import { ReactNode } from 'react';

interface StatusAreaProps {
  header: string;
  children: ReactNode;
}

export function StatusArea({ header, children }: StatusAreaProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm text-gray-600 font-medium">{header}</div>
      {children}
    </div>
  );
}
