'use client';

import * as React from 'react';
import {
  Settings,
  Copy,
  RotateCcw,
  Sun,
  Moon,
  ChevronDown,
  Undo2,
  Redo2,
  Wand2,
  Monitor,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ThemeCustomizer() {
  const [config, setConfig] = useConfig();
  const [isOpen, setIsOpen] = React.useState(false);
  const { resolvedTheme, setTheme, theme: activeTheme } = useTheme();

  const [history, setHistory] = React.useState<ThemeConfig[]>([]);
  const [redoStack, setRedoStack] = React.useState<ThemeConfig[]>([]);
  const lastSavedConfig = React.useRef<ThemeConfig>(config);

  const isDark = resolvedTheme === 'dark';
  const currentColors = isDark ? config.dark : config.light;

  const pushToHistory = (newConfig: ThemeConfig) => {
    setHistory((prev) => [...prev, lastSavedConfig.current].slice(-20));
    setRedoStack([]);
    lastSavedConfig.current = newConfig;
    setConfig(newConfig);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    if (!prev) return;
    setRedoStack((prevStack) => [...prevStack, config]);
    setHistory((prevHistory) => prevHistory.slice(0, -1));
    lastSavedConfig.current = prev;
    setConfig(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setHistory((prevHistory) => [...prevHistory, config]);
    setRedoStack((prevStack) => prevStack.slice(0, -1));
    lastSavedConfig.current = next;
    setConfig(next);
  };

  const updateColor = (key: keyof ColorConfig, value: string, isFinal = true) => {
    const mode = isDark ? 'dark' : 'light';
    const newConfig = {
      ...config,
      [mode]: {
        ...config[mode],
        [key]: value,
      },
    };
    if (isFinal) pushToHistory(newConfig);
    else setConfig(newConfig);
  };

  const updateConfigValue = (key: keyof ThemeConfig, value: string, isFinal = true) => {
    const newConfig = { ...config, [key]: value };
    if (isFinal) pushToHistory(newConfig);
    else setConfig(newConfig);
  };

  const ColorInput = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (val: string, final: boolean) => void;
  }) => {
    const pickerValue = value.startsWith('oklch') ? '#4F46E5' : value;

    return (
      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/50 group transition-colors hover:bg-muted/60">
        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative h-6 w-6 shrink-0 rounded-md border border-border overflow-hidden">
            <input
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
              value={pickerValue}
              onChange={(event) => onChange(event.target.value, false)}
              onBlur={(event) => onChange(event.target.value, true)}
            />
            <div className="w-full h-full pointer-events-none" style={{ backgroundColor: value }} />
          </div>
          <input
            type="text"
            spellCheck={false}
            className="flex-1 bg-transparent border-none p-0 text-[11px] font-mono focus:ring-0 outline-none text-foreground/90 lowercase"
            value={value}
            onChange={(event) => onChange(event.target.value, true)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('h-9 w-9 rounded-full', isOpen && 'bg-accent')}
        title="Theme settings"
        aria-label="Theme settings"
      >
        <Settings
          className={cn('h-[1.2rem] w-[1.2rem] transition-transform duration-300', isOpen && 'rotate-90')}
        />
      </Button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 z-50 w-[calc(100vw-32px)] sm:w-[380px] rounded-xl border bg-popover p-0 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={undo}
                disabled={history.length === 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={redo}
                disabled={redoStack.length === 0}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-semibold bg-background"
                onClick={() => pushToHistory(DEFAULT_CONFIG)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
                aria-label="Close theme customizer"
              >
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </div>
          </div>

          <div className="p-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Appearance
                </Label>
                <div className="flex p-1 bg-muted rounded-lg gap-1 border border-border/10">
                  <Button
                    variant={activeTheme === 'light' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'flex-1 h-8 rounded-md transition-all',
                      activeTheme === 'light' && 'bg-background shadow-sm'
                    )}
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4 mr-2" /> Light
                  </Button>
                  <Button
                    variant={activeTheme === 'dark' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'flex-1 h-8 rounded-md transition-all',
                      activeTheme === 'dark' && 'bg-background shadow-sm'
                    )}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4 mr-2" /> Dark
                  </Button>
                  <Button
                    variant={activeTheme === 'system' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'flex-1 h-8 rounded-md transition-all',
                      activeTheme === 'system' && 'bg-background shadow-sm'
                    )}
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="h-4 w-4 mr-2" /> System
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Theme
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Select
                      value={config.theme}
                      onValueChange={(val) => {
                        const preset = THEME_PRESETS[val];
                        if (preset) {
                          pushToHistory({ ...DEFAULT_CONFIG, ...preset, theme: val });
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full bg-background border shadow-sm">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(THEME_PRESETS).map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title="Randomize"
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

              <Tabs defaultValue="colors" className="w-full">
                <TabsList className="w-full h-9 bg-muted/50 p-1">
                  <TabsTrigger value="colors" className="text-xs">
                    Colors
                  </TabsTrigger>
                  <TabsTrigger value="typography" className="text-xs">
                    Type
                  </TabsTrigger>
                  <TabsTrigger value="layout" className="text-xs">
                    Other
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="colors" className="mt-4">
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {['primary', 'background', 'foreground', 'card', 'border', 'secondary', 'muted', 'accent'].map(
                      (key) => (
                        <ColorInput
                          key={key}
                          label={key}
                          value={currentColors[key as keyof ColorConfig] || ''}
                          onChange={(val, final) => updateColor(key as keyof ColorConfig, val, final)}
                        />
                      )
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="typography" className="mt-4 space-y-4">
                  {[
                    { label: 'Sans Stack', key: 'fontSans' },
                    { label: 'Serif Stack', key: 'fontSerif' },
                    { label: 'Mono Stack', key: 'fontMono' },
                  ].map((font) => (
                    <div key={font.key} className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground/70">{font.label}</Label>
                      <Select
                        value={config[font.key as keyof ThemeConfig] as string}
                        onValueChange={(val) => updateConfigValue(font.key as keyof ThemeConfig, val)}
                      >
                        <SelectTrigger className="h-9 w-full bg-background/50 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Geist, sans-serif" className="text-xs">
                            Geist
                          </SelectItem>
                          <SelectItem value="Inter, sans-serif" className="text-xs">
                            Inter
                          </SelectItem>
                          <SelectItem value="system-ui, sans-serif" className="text-xs">
                            System
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="layout" className="mt-4 space-y-5">
                  {[
                    { label: 'Border Radius', key: 'radius', min: 0, max: 2, step: 0.05, unit: 'rem' },
                    { label: 'Base Spacing', key: 'spacing', min: 0.1, max: 1, step: 0.01, unit: 'rem' },
                  ].map((setting) => (
                    <div key={setting.key} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] uppercase text-muted-foreground/70">
                          {setting.label}
                        </Label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {config[setting.key as keyof ThemeConfig]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={setting.min}
                        max={setting.max}
                        step={setting.step}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                        value={parseFloat(config[setting.key as keyof ThemeConfig] as string)}
                        onChange={(event) =>
                          updateConfigValue(setting.key as keyof ThemeConfig, `${event.target.value}${setting.unit}`, false)
                        }
                        onMouseUp={(event) =>
                          updateConfigValue(
                            setting.key as keyof ThemeConfig,
                            `${(event.target as HTMLInputElement).value}${setting.unit}`,
                            true
                          )
                        }
                      />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>

            <div className="mt-8 pt-4 border-t flex flex-col gap-2">
              <Button
                size="sm"
                className="w-full h-9 font-bold"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(config, null, 2))}
              >
                <Copy className="h-4 w-4 mr-2" /> Export Config
              </Button>
              <p className="text-[10px] text-center text-muted-foreground px-4">
                Upgrade to Pro to sync themes across devices.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
