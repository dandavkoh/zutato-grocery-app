import React, { useState, useRef, useEffect } from 'react';

interface SwipeActionProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

const SwipeAction: React.FC<SwipeActionProps> = ({ children, onDelete, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80; // Mindest-Swipe-Distanz zum Öffnen
  const MAX_SWIPE = 120; // Maximale Swipe-Distanz

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setCurrentX(touch.clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    
    // Nur nach links swipen erlauben (negative Werte)
    const newTranslateX = Math.min(0, Math.max(-MAX_SWIPE, deltaX));
    setTranslateX(newTranslateX);
    setCurrentX(touch.clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Prüfen ob Swipe-Threshold erreicht wurde
    if (Math.abs(translateX) > SWIPE_THRESHOLD) {
      setIsOpen(true);
      setTranslateX(-MAX_SWIPE);
    } else {
      setIsOpen(false);
      setTranslateX(0);
    }
  };

  const handleDelete = () => {
    onDelete();
    setIsOpen(false);
    setTranslateX(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTranslateX(0);
  };

  // Schließen bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Hintergrund-Action */}
      <div className="absolute inset-y-0 right-0 flex items-center bg-red-500 w-[120px]">
        <button
          onClick={handleDelete}
          className="w-full h-full px-6 text-white font-semibold text-sm whitespace-nowrap bg-red-500 hover:bg-red-600 focus:bg-red-500 active:bg-red-700 transition-colors duration-200 flex items-center justify-center"
          style={{ backgroundColor: '#ef4444' }}
        >
          Löschen
        </button>
      </div>

      {/* Hauptinhalt */}
      <div
        ref={contentRef}
        className="relative bg-neutral-900 transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${translateX}px)`,
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeAction; 