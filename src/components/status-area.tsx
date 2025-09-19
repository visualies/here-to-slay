import { ReactNode, useEffect, useState } from 'react';
import { useStatus } from '../hooks/use-status';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface StatusAreaProps {
  header: string;
  children: ReactNode;
}

export function StatusArea({ header, children }: StatusAreaProps) {
  const { message: currentMessage } = useStatus();
  const [isVisible, setIsVisible] = useState(false);

  // Handle fade in/out animation
  useEffect(() => {
    if (currentMessage) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [currentMessage]);

  // If there's a status message, show it instead of the regular content
  if (currentMessage) {
    const getMessageStyles = (type: string) => {
      switch (type) {
        case 'error':
          return {
            textColor: 'text-red-600',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-400',
            icon: X
          };
        case 'warning':
          return {
            textColor: 'text-yellow-600',
            bgColor: 'bg-yellow-100', 
            borderColor: 'border-yellow-400',
            icon: AlertTriangle
          };
        case 'success':
          return {
            textColor: 'text-green-600',
            bgColor: 'bg-green-100',
            borderColor: 'border-green-400',
            icon: CheckCircle
          };
        case 'info':
        default:
          return {
            textColor: 'text-blue-600',
            bgColor: 'bg-blue-100',
            borderColor: 'border-blue-400',
            icon: Info
          };
      }
    };

    const styles = getMessageStyles(currentMessage.type);
    const IconComponent = styles.icon;

    return (
      <div className="flex flex-col items-center gap-2" data-testid="status-message">
        <div 
          className={`text-sm font-medium transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          } ${styles.textColor}`}
          data-testid="status-message-text"
        >
          {currentMessage.message}
        </div>
        <div className={`w-12 h-12 ${styles.bgColor} border-2 border-dashed ${styles.borderColor} rounded-lg flex items-center justify-center transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`} data-testid="status-message-icon">
          <IconComponent className={`w-4 h-4 ${styles.textColor}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2" data-testid="status-area">
      <div className="text-sm text-foreground font-medium" data-testid="status-header">{header}</div>
      {children}
    </div>
  );
}
