import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { THEME } from '../../lib/theme';

interface ChipProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Chip({ label, variant = 'default', icon, style, textStyle }: ChipProps) {
  
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: THEME.colors.successLight, text: THEME.colors.success };
      case 'warning':
        return { bg: THEME.colors.warningLight, text: THEME.colors.warning };
      case 'error':
        return { bg: THEME.colors.errorLight, text: THEME.colors.error };
      case 'primary':
        return { bg: THEME.colors.primaryLight, text: THEME.colors.primaryDark };
      case 'default':
      default:
        return { bg: THEME.colors.divider, text: THEME.colors.textSecondary };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]}>
      {icon}
      <Text style={[THEME.typography.chip, { color: colors.text }, textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: THEME.layout.borderRadius.sm,
    gap: 4,
    alignSelf: 'flex-start',
  },
});
