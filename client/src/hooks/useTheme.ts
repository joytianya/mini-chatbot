import { useState, useCallback } from 'react';
import { defaultTheme } from '../Config';
import { storageService } from '../utils/storage';

interface ThemeState {
  light: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
    };
    border: string;
    messageBackground: {
      user: string;
      assistant: string;
    };
  };
  dark: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
    };
    border: string;
    messageBackground: {
      user: string;
      assistant: string;
    };
  };
}

const useTheme = () => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
    storageService.setItem('darkMode', !darkMode);
  }, [darkMode]);

  return {
    theme: darkMode ? defaultTheme.dark : defaultTheme.light,
    darkMode,
    setDarkMode,
    toggleDarkMode
  };
};

export default useTheme;
export type ThemeState = ReturnType<typeof useTheme>;
