import { ReactNode } from 'react';

interface StackProps {
  children: ReactNode;
  className?: string;
}

export function Stack({ children, className = '' }: StackProps) {
  return (
    <div className={`grid ${className}`}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div key={index} className="grid-area-[1/1]" style={{ gridArea: '1/1' }}>
              {child}
            </div>
          ))
        : <div className="grid-area-[1/1]" style={{ gridArea: '1/1' }}>
            {children}
          </div>
      }
    </div>
  );
}