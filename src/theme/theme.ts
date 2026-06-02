import { lightColors, darkColors, ThemeColors } from './colors';

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const getTheme = (isDark: boolean): Theme => {
  return {
    dark: isDark,
    colors: isDark ? darkColors : lightColors,
  };
};
