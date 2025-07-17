import React from 'react';

interface FontAwesomeIconProps {
  icon: string;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  style?: 'solid' | 'regular' | 'light' | 'thin' | 'duotone' | 'brands';
}

const FontAwesomeIcon: React.FC<FontAwesomeIconProps> = ({ 
  icon, 
  className = '', 
  size = 'base',
  style = 'solid' 
}) => {
  // Remove 'fa-' prefix if present
  const iconName = icon.startsWith('fa-') ? icon.substring(3) : icon;
  
  // Map style to Font Awesome class
  const styleClass = {
    solid: 'fas',
    regular: 'far',
    light: 'fal',
    thin: 'fat',
    duotone: 'fad',
    brands: 'fab'
  }[style];
  
  // Map size to Tailwind classes
  const sizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl'
  }[size];
  
  return (
    <i className={`${styleClass} fa-${iconName} ${sizeClass} ${className}`} />
  );
};

export default FontAwesomeIcon; 