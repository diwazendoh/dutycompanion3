import React, { useState, useEffect } from 'react';

export const PWAInstallBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="p-3 bg-green-950/60 rounded-xl border border-green-800/60 text-white">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
        <span className="text-[12px] font-semibold text-green-100">
          {isOnline ? 'Synced' : 'Offline Mode'}
        </span>
      </div>
    </div>
  );
};


