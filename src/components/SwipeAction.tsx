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
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80; // Mindest-Swipe-Distanz zum Öffnen
  const MAX_SWIPE = 120; // Maximale Swipe-Distanz


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

  // Native touch event handling to prevent scrolling during swipe
  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    let currentStartX = 0;
    let currentStartY = 0;
    let currentIsDragging = false;
    let currentTranslateX = 0;
    let gestureDirection: 'horizontal' | 'vertical' | null = null;
    const GESTURE_THRESHOLD = 10; // Minimum distance to determine direction

    const handleNativeTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      currentStartX = touch.clientX;
      currentStartY = touch.clientY;
      currentIsDragging = true;
      currentTranslateX = 0;
      gestureDirection = null;
      
      setStartX(touch.clientX);
      setStartY(touch.clientY);
      setCurrentX(touch.clientX);
      setIsDragging(true);
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (!currentIsDragging) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - currentStartX;
      const deltaY = touch.clientY - currentStartY;
      
      // Determine gesture direction if not already determined
      if (gestureDirection === null && (Math.abs(deltaX) > GESTURE_THRESHOLD || Math.abs(deltaY) > GESTURE_THRESHOLD)) {
        gestureDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      }
      
      // Only prevent default for horizontal gestures (swipe-to-delete)
      if (gestureDirection === 'horizontal') {
        e.preventDefault();
        e.stopPropagation();
        
        // Update local and React state for swipe animation
        const newTranslateX = Math.min(0, Math.max(-MAX_SWIPE, deltaX));
        currentTranslateX = newTranslateX;
        setTranslateX(newTranslateX);
        setCurrentX(touch.clientX);
      }
      // For vertical gestures, allow normal scrolling by not preventing default
    };

    const handleNativeTouchEnd = () => {
      currentIsDragging = false;
      setIsDragging(false);
      gestureDirection = null;
      
      // Only handle swipe-to-delete logic for horizontal gestures
      if (gestureDirection === 'horizontal' || Math.abs(currentTranslateX) > 0) {
        // Prüfen ob Swipe-Threshold erreicht wurde
        if (Math.abs(currentTranslateX) > SWIPE_THRESHOLD) {
          setIsOpen(true);
          setTranslateX(-MAX_SWIPE);
        } else {
          setIsOpen(false);
          setTranslateX(0);
        }
      }
    };

    // Add native event listeners with passive: false to allow preventDefault
    element.addEventListener('touchstart', handleNativeTouchStart, { passive: true });
    element.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    element.addEventListener('touchend', handleNativeTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleNativeTouchStart);
      element.removeEventListener('touchmove', handleNativeTouchMove);
      element.removeEventListener('touchend', handleNativeTouchEnd);
    };
  }, [MAX_SWIPE, SWIPE_THRESHOLD]);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-white ${className}`}
      style={{ touchAction: isDragging ? 'none' : 'pan-y' }}
    >
      {/* Hintergrund-Action */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center bg-red-500 w-[120px] z-0"
        style={{ opacity: Math.min(1, Math.abs(translateX) / MAX_SWIPE) }}
      >
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
        className="relative bg-white w-full z-10 transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${translateX}px)`,
          touchAction: isDragging ? 'none' : 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeAction; 