'use client';

import * as React from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DEFAULT_CONFIG, type ThemeConfig } from '@/hooks/use-config';

type ConfigContextType = [ThemeConfig, (config: ThemeConfig | ((prev: ThemeConfig) => ThemeConfig)) => void];

const ConfigContext = React.createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useLocalStorage<ThemeConfig>('theme-config', DEFAULT_CONFIG);

  return (
    <ConfigContext.Provider value={[config, setConfig]}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
