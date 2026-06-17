import { useEffect, useState, useRef } from 'react';

interface RuptureTimerProps {
  stats?: string; // Kann weiterhin für Initialisierung oder andere Zwecke genutzt werden
  className?: string;
}

const GAME_DATA_PATH = '/data/gameData.json';

const RuptureTimer = ({ 
  className = "",
}: RuptureTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const targetTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);

  useEffect(() => {
    // Lädt gameData.json und extrahiert nextWaveTimer (nur einmal beim Mount)
    const loadData = async () => {
      try {
        const response = await fetch(GAME_DATA_PATH);
        const data = await response.json();
        const rawData = data.itemData?.EnviroWaveTimer;
        
        if (rawData && typeof rawData.nextWaveTimer === 'number') {
          // nextWaveTimer ist in Sekunden, auf ganze Zahl runden
          const initialTimeLeft = Math.round(rawData.nextWaveTimer);
          setTimeLeft(initialTimeLeft);
          
          // Speichere die Gesamtdauer für den Fortschrittsbalken
          totalDurationRef.current = 6000;
          
          // Berechne den Zielzeitpunkt basierend auf dem Startzeitpunkt + nextWaveTimer
          targetTimeRef.current = Date.now() + (initialTimeLeft * 1000);
          
          // Timer-Intervall starten, das jede Sekunde die verbleibende Zeit berechnet
          const timerId = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 0) return 0;
              
              const currentNow = Date.now();
              const remainingMs = targetTimeRef.current - currentNow;
              return Math.max(0, Math.round(remainingMs / 1000));
            });
          }, 100);
          
          // Cleanup: Intervall löschen, wenn die Komponente unmountet
          return () => clearInterval(timerId);
        } else {
          setError('nextWaveTimer nicht gefunden oder ungültig');
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden von gameData.json:', err);
        setError(`Fehler: ${(err as Error).message}`);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Hilfsfunktion zur Formatierung von Sekunden in MM:SS (z.B. 09:45)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Berechnet den prozentualen Fortschritt für den Balken (von 100% runter auf 0%)
  const progressPercentage = timeLeft > 0 ? ((totalDurationRef.current - timeLeft) / totalDurationRef.current) * 100 : 0;

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
