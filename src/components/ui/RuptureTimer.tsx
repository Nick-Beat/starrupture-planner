import { useEffect, useState } from 'react';

interface RuptureTimerProps {
  stats?: string; // Kann weiterhin für Initialisierung oder andere Zwecke genutzt werden
  className?: string;
}

const RuptureTimer = ({ 
  className = "",
}: RuptureTimerProps) => {
  const TOTAL_TIME = 10 * 60; // 10 Minuten in Sekunden (600s)
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_TIME);

  useEffect(() => {
    // Falls der Timer bereits abgelaufen ist, nichts tun
    if (timeLeft <= 0) return;

    // Intervall starten, das jede Sekunde die verbleibende Zeit um 1 reduziert
    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        // Wenn der Timer abgelaufen ist, starte direkt wieder von vorne
        if (prev <= 1) {
          return TOTAL_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup: Intervall löschen, wenn die Komponente unmountet
    return () => clearInterval(timerId);
  }, [timeLeft]);

  // Hilfsfunktion zur Formatierung von Sekunden in MM:SS (z.B. 09:45)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Berechnet den prozentualen Fortschritt für den Balken (von 100% runter auf 0%)
  const progressPercentage = (timeLeft / TOTAL_TIME) * 100;

  return (
    <div className={`flex flex-col min-w-[120px] sm:min-w-[140px] ${className}`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-base-content/60 text-xs sm:text-sm">Next Rupture:</span>
        <span className="font-semibold text-xs sm:text-sm tabular-nums">
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="w-full bg-base-300 rounded-full h-1.5 sm:h-2">
        <div
          className="h-1.5 sm:h-2 rounded-full transition-all duration-1000 ease-linear bg-sky-400"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div> 
  ); 
};

export default RuptureTimer;
