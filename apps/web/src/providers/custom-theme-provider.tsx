'use client';

import { useEffect } from 'react';
import { useConfig } from '@/providers/config-provider';
import { useTheme } from 'next-themes';

export function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const [config] = useConfig();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === 'dark';
    const colors = isDark ? config.dark : config.light;

    // Apply colors for current mode
    Object.entries(colors).forEach(([key, value]) => {
      if (!value) return;
      // Convert camelCase to kebab-case (e.g., primaryForeground to primary-foreground)
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      root.style.setProperty(`--${cssKey}`, value);
    });

    // Apply other variables
    if (config.radius) {
      root.style.setProperty('--radius', config.radius);
      // Manually calculate radius steps for Tailwind 4 @theme
      const radiusValue = parseFloat(config.radius);
      const unit = config.radius.replace(/[\d.]/g, '');
      root.style.setProperty('--radius-sm', `${Math.max(0, radiusValue - 0.25)}${unit}`);
      root.style.setProperty('--radius-md', `${Math.max(0, radiusValue - 0.125)}${unit}`);
      root.style.setProperty('--radius-lg', config.radius);
      root.style.setProperty('--radius-xl', `${radiusValue + 0.25}${unit}`);
      root.style.setProperty('--radius-2xl', `${radiusValue + 0.5}${unit}`);
    }
    
    if (config.spacing) root.style.setProperty('--spacing', config.spacing);
    if (config.letterSpacing) root.style.setProperty('--letter-spacing', config.letterSpacing);
    if (config.fontSans) root.style.setProperty('--font-sans', config.fontSans);
    if (config.fontSerif) root.style.setProperty('--font-serif', config.fontSerif);
    if (config.fontMono) root.style.setProperty('--font-mono', config.fontMono);

    // Apply shadow variables
    if (config.shadowColor) root.style.setProperty('--shadow-color', config.shadowColor);
    if (config.shadowOpacity) root.style.setProperty('--shadow-opacity', config.shadowOpacity);
    if (config.shadowBlur) root.style.setProperty('--shadow-blur', config.shadowBlur);
    
    // Composite shadow
    const shadow = `0 1px ${config.shadowBlur} 0px color-mix(in oklch, ${config.shadowColor} ${parseFloat(config.shadowOpacity) * 100}%, transparent)`;
    root.style.setProperty('--shadow', shadow);
    root.style.setProperty('--shadow-md', shadow);
    root.style.setProperty('--shadow-lg', shadow);

  }, [config, resolvedTheme]);

  return <>{children}</>;
}
