'use client';

import { useEffect, useState } from 'react';

interface TeamIconProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  color?: string;
}

export function TeamIcon({ src, alt, width, height, color }: TeamIconProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    if (color) {
      // Fetch and inline SVG when color is provided
      fetch(src)
        .then((res) => res.text())
        .then((text) => {
          // Replace only dark colors with currentColor, preserve white/light colors
          let processed = text;
          
          // List of white/light colors to preserve (case-insensitive)
          const lightColors = [
            '#FFFFFF', '#FFF', 'white',
            '#F9F9F9', '#F9F9F9',
            '#FAFAFA', '#FAFAFA',
            '#F5F5F5', '#F5F5F5',
            '#E2E2E2', '#E2E2E2',
            '#E5E5E5', '#E5E5E5',
          ];
          
          // Replace dark colors with currentColor, but skip light colors
          processed = processed.replace(/fill="([^"]+)"/gi, (match, fillValue) => {
            const normalizedFill = fillValue.trim().toUpperCase();
            
            // If it's already currentColor, keep it
            if (normalizedFill === 'CURRENTCOLOR') {
              return match;
            }
            
            // If it's a light color, preserve it
            if (lightColors.some(light => normalizedFill === light.toUpperCase())) {
              return match;
            }
            
            // If it's black or very dark colors, replace with currentColor
            if (normalizedFill === 'BLACK' || 
                normalizedFill === '#000' || 
                normalizedFill === '#000000' ||
                normalizedFill === '#2A2B2A' ||
                normalizedFill.startsWith('#') && normalizedFill.length === 7) {
              // Check if it's a dark color (low brightness)
              const hex = normalizedFill.replace('#', '');
              if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                
                // Only replace if brightness is low (dark color)
                if (brightness < 200) {
                  return 'fill="currentColor"';
                }
              }
            }
            
            // For other colors, check if they're dark
            if (normalizedFill.startsWith('#')) {
              const hex = normalizedFill.replace('#', '');
              if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                
                // Only replace dark colors (brightness < 200)
                if (brightness < 200) {
                  return 'fill="currentColor"';
                }
              } else if (hex.length === 3) {
                // Short hex format
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                
                if (brightness < 200) {
                  return 'fill="currentColor"';
                }
              }
            }
            
            // Keep everything else as-is
            return match;
          });
          
          setSvgContent(processed);
        })
        .catch(() => {
          // Fallback to img if fetch fails
          setSvgContent(null);
        });
    } else {
      setSvgContent(null);
    }
  }, [src, color]);

  if (color && svgContent) {
    return (
      <span
        style={{
          color,
          display: 'inline-flex',
          alignItems: 'center',
          width: `${width}px`,
          height: `${height}px`,
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  // Fallback to regular img
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  );
}

