import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage.ts';
import type { ThemeState, ColorTheme, Theme } from '../types.ts';

const defaultThemeState: ThemeState = {
    mode: 'light',
    customColors: null,
};

const applyColors = (colors: ColorTheme | null) => {
    const root = window.document.documentElement;
    if (colors) {
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-background', colors.background);
        root.style.setProperty('--color-surface', colors.surface);
        root.style.setProperty('--color-text-primary', colors.textPrimary);
        root.style.setProperty('--color-text-secondary', colors.textSecondary);
        root.style.setProperty('--color-text-on-primary', colors.textOnPrimary);
        root.style.setProperty('--color-border', colors.border);
        const rgb = colors.primary.match(/\w\w/g)?.map(x => parseInt(x, 16));
        if (rgb) {
             root.style.setProperty('--color-primary-rgb', rgb.join(', '));
        }
    } else {
        // Clear inline styles to revert to CSS-defined variables
        root.style.removeProperty('--color-primary');
        root.style.removeProperty('--color-background');
        root.style.removeProperty('--color-surface');
        root.style.removeProperty('--color-text-primary');
        root.style.removeProperty('--color-text-secondary');
        root.style.removeProperty('--color-text-on-primary');
        root.style.removeProperty('--color-border');
        root.style.removeProperty('--color-primary-rgb');
    }
}

export const useTheme = (): [ThemeState, () => void, (colors: ColorTheme, mode: Theme) => void, () => void] => {
    const [themeState, setThemeState] = useLocalStorage<ThemeState>('devcore_theme_state', defaultThemeState);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(themeState.mode);
        applyColors(themeState.customColors);
    }, [themeState]);

    const toggleTheme = () => {
        setThemeState(prev => ({
            ...prev,
            mode: prev.mode === 'light' ? 'dark' : 'light'
        }));
    };
    
    const applyCustomTheme = (colors: ColorTheme, mode: Theme) => {
        setThemeState({ mode, customColors: colors });
    };

    const clearCustomTheme = () => {
        // We keep the mode, but clear custom colors
        setThemeState(prev => ({ ...prev, customColors: null }));
    };

    return [themeState, toggleTheme, applyCustomTheme, clearCustomTheme];
};
