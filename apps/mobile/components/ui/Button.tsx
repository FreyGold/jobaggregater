import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps,
  View
} from 'react-native';
import { THEME } from '../../lib/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ 
  title, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  icon, 
  style, 
  textStyle, 
  disabled, 
  ...props 
}: ButtonProps) {
  
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {};
    
    switch (variant) {
      case 'primary':
        base = { backgroundColor: THEME.colors.primary };
        break;
      case 'secondary':
        base = { backgroundColor: THEME.colors.primaryLight };
        break;
      case 'outline':
        base = { backgroundColor: 'transparent', borderWidth: 1, borderColor: THEME.colors.border };
        break;
      case 'ghost':
        base = { backgroundColor: 'transparent' };
        break;
    }

    // Icon only buttons should be perfectly square if no title exists
    const hasIconOnly = icon && !title;

    switch (size) {
      case 'sm':
        base = { ...base, paddingVertical: hasIconOnly ? 8 : 8, paddingHorizontal: hasIconOnly ? 8 : 12, borderRadius: THEME.layout.borderRadius.sm };
        break;
      case 'md':
        base = { ...base, paddingVertical: hasIconOnly ? 12 : 12, paddingHorizontal: hasIconOnly ? 12 : 16, borderRadius: THEME.layout.borderRadius.md };
        break;
      case 'lg':
        base = { ...base, paddingVertical: hasIconOnly ? 16 : 16, paddingHorizontal: hasIconOnly ? 16 : 24, borderRadius: THEME.layout.borderRadius.lg };
        break;
    }

    if (disabled) {
      base.opacity = 0.5;
    }

    return base as ViewStyle;
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return { color: '#FFFFFF', fontWeight: '600' };
      case 'secondary':
        return { color: THEME.colors.primaryDark, fontWeight: '600' };
      case 'outline':
      case 'ghost':
        return { color: THEME.colors.text, fontWeight: '600' };
      default:
        return {};
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, getContainerStyle(), style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : THEME.colors.primary} />
      ) : (
        <View style={styles.innerContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {!!title && (
            <Text style={[getTextStyle(), size === 'sm' && { fontSize: 13 }, textStyle]}>
              {title}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
