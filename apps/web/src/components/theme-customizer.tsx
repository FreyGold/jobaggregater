'use client';

import * as React from 'react';
import { Settings, RotateCcw, Sun, Moon, Monitor, Undo2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useConfig } from '@/providers/config-provider';
import { THEME_PRESETS, DEFAULT_CONFIG, type ColorConfig, type ThemeConfig } from '@/hooks/use-config';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ThemeCustomizer() {
  const [config, setConfig] = useConfig();
  const [isOpen, setIsOpen] = React.useState(false);
  const { setTheme, theme: activeTheme } = useTheme();
  const [history, setHistory] = React.useState<ThemeConfig[]>([]);
  const lastSavedConfig = React.useRef<ThemeConfig>(config);

  const isDark = activeTheme === 'dark';
  const currentColors = isDark ? config.dark : config.light;

  const pushToHistory = (newConfig: ThemeConfig) => {
    setHistory((prev) => [...prev, lastSavedConfig.current].slice(-20));
    lastSavedConfig.current = newConfig;
    setConfig(newConfig);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((prevHistory) => prevHistory.slice(0, -1));
    lastSavedConfig.current = prev;
    setConfig(prev);
  };

  const updateColor = (key: keyof ColorConfig, value: string) => {
    const mode = isDark ? 'dark' : 'light';
    const newConfig = {
      ...config,
      [mode]: {
        ...config[mode],
        [key]: value,
      },
    };
    pushToHistory(newConfig);
  };

  const updateRadius = (value: string) => {
    pushToHistory({ ...config, radius: value });
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9"
        title="Theme settings"
        aria-label="Theme settings"
      >
        <Settings className="h-[1.2rem] w-[1.2rem]" />
      </Button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 z-50 w-[calc(100vw-32px)] sm:w-80 rounded-lg border bg-popover p-4 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Theme</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={history.length === 0}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 px-2 text-xs"
              >
                Done
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Appearance</Label>
            <div className="flex gap-2">
              {['light', 'dark', 'system'].map((mode) => (
                <Button
                  key={mode}
                  variant={activeTheme === mode ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 capitalize"
                  onClick={() => setTheme(mode)}
                >
                  {mode === 'light' && <Sun className="h-4 w-4 mr-1" />}
                  {mode === 'dark' && <Moon className="h-4 w-4 mr-1" />}
                  {mode === 'system' && <Monitor className="h-4 w-4 mr-1" />}
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Preset</Label>
            <Select
              value={config.theme}
              onValueChange={(val) => {
                const preset = THEME_PRESETS[val];
                if (preset) {
                  pushToHistory({ ...DEFAULT_CONFIG, ...preset, theme: val });
                }
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue>
                  {capitalize(config.theme)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(THEME_PRESETS).map((name) => (
                  <SelectItem key={name} value={name}>
                    {capitalize(name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Primary Color</Label>
            <div className="flex items-center gap-2">
              <div className="relative h-10 w-10 rounded border border-border overflow-hidden shrink-0">
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={currentColors.primary.startsWith('oklch') ? '#4F46E5' : currentColors.primary}
                  onChange={(e) => updateColor('primary', e.target.value)}
                />
                <div
                  className="w-full h-full pointer-events-none"
                  style={{ backgroundColor: currentColors.primary }}
                />
              </div>
              <input
                type="text"
                spellCheck={false}
                className="flex-1 bg-transparent border-none text-xs font-mono focus:ring-0 outline-none text-foreground"
                value={currentColors.primary}
                onChange={(e) => updateColor('primary', e.target.value)}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Randomize color"
                onClick={() => {
                  const randomHue = Math.floor(Math.random() * 360);
                  pushToHistory({
                    ...config,
                    light: { ...config.light, primary: `oklch(0.6 0.15 ${randomHue})` },
                    dark: { ...config.dark, primary: `oklch(0.7 0.12 ${randomHue})` },
                  });
                }}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Border Radius</Label>
              <span className="text-xs font-mono text-muted-foreground">{config.radius}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              value={parseFloat(config.radius as string)}
              onChange={(e) => updateRadius(`${e.target.value}rem`)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToHistory(DEFAULT_CONFIG)}
              className="flex-1"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
