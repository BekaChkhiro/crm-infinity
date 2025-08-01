import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';

const themes = [
  { name: 'light', label: 'Light', icon: Sun },
  { name: 'dark', label: 'Dark', icon: Moon },
  { name: 'system', label: 'System', icon: Monitor },
];

const colorThemes = [
  { name: 'default', label: 'Default', color: 'hsl(222.2 84% 4.9%)' },
  { name: 'blue', label: 'Blue', color: 'hsl(221.2 83.2% 53.3%)' },
  { name: 'green', label: 'Green', color: 'hsl(142.1 76.2% 36.3%)' },
  { name: 'purple', label: 'Purple', color: 'hsl(262.1 83.3% 57.8%)' },
  { name: 'orange', label: 'Orange', color: 'hsl(24.6 95% 53.1%)' },
  { name: 'red', label: 'Red', color: 'hsl(346.8 77.2% 49.8%)' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [colorTheme, setColorTheme] = React.useState('default');

  React.useEffect(() => {
    // Load saved color theme from localStorage
    const savedColorTheme = localStorage.getItem('color-theme') || 'default';
    setColorTheme(savedColorTheme);
    applyColorTheme(savedColorTheme);
  }, []);

  const getCurrentThemeIcon = () => {
    const currentTheme = themes.find(t => t.name === theme);
    return currentTheme ? currentTheme.icon : Sun;
  };

  const applyColorTheme = (themeName: string) => {
    const root = document.documentElement;
    
    // Remove existing color theme classes
    colorThemes.forEach(t => {
      root.classList.remove(`theme-${t.name}`);
    });
    
    // Add new color theme class
    if (themeName !== 'default') {
      root.classList.add(`theme-${themeName}`);
    }

    // Update CSS custom properties based on theme
    switch (themeName) {
      case 'blue':
        root.style.setProperty('--primary', '221.2 83.2% 53.3%');
        root.style.setProperty('--primary-foreground', '210 40% 98%');
        break;
      case 'green':
        root.style.setProperty('--primary', '142.1 76.2% 36.3%');
        root.style.setProperty('--primary-foreground', '355.7 100% 97.3%');
        break;
      case 'purple':
        root.style.setProperty('--primary', '262.1 83.3% 57.8%');
        root.style.setProperty('--primary-foreground', '210 40% 98%');
        break;
      case 'orange':
        root.style.setProperty('--primary', '24.6 95% 53.1%');
        root.style.setProperty('--primary-foreground', '60 9.1% 97.8%');
        break;
      case 'red':
        root.style.setProperty('--primary', '346.8 77.2% 49.8%');
        root.style.setProperty('--primary-foreground', '355.7 100% 97.3%');
        break;
      default:
        root.style.setProperty('--primary', '222.2 84% 4.9%');
        root.style.setProperty('--primary-foreground', '210 40% 98%');
        break;
    }
  };

  const handleColorThemeChange = (themeName: string) => {
    setColorTheme(themeName);
    localStorage.setItem('color-theme', themeName);
    applyColorTheme(themeName);
  };

  const CurrentIcon = getCurrentThemeIcon();

  return (
    <div className="flex items-center gap-2">
      {/* Color Theme Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="p-2">
            <p className="text-sm font-medium mb-2">Color Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {colorThemes.map((colorThemeOption) => (
                <button
                  key={colorThemeOption.name}
                  onClick={() => handleColorThemeChange(colorThemeOption.name)}
                  className={`p-2 rounded-md border-2 transition-colors ${
                    colorTheme === colorThemeOption.name
                      ? 'border-primary'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <div 
                    className="w-6 h-6 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: colorThemeOption.color }}
                  />
                  <span className="text-xs">{colorThemeOption.label}</span>
                </button>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Light/Dark Mode Toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <CurrentIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            return (
              <DropdownMenuItem
                key={themeOption.name}
                onClick={() => setTheme(themeOption.name)}
                className={`flex items-center gap-2 ${
                  theme === themeOption.name ? 'bg-accent' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                {themeOption.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}