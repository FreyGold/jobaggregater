import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabBarButton({
  isFocused,
  label,
  iconName,
  onPress,
  onLongPress,
}: {
  isFocused: boolean;
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      android_ripple={{ color: 'transparent' }}
    >
      <Animated.View style={[styles.tabButtonContent, animatedStyle]}>
        <Ionicons
          name={iconName}
          size={20}
          color={isFocused ? '#ffffff' : '#71717a'}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? '#ffffff' : '#71717a' },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const TAB_BAR_MARGIN = 20;
  const containerWidth = width - TAB_BAR_MARGIN * 2;
  const paddingHorizontal = 8;
  const usableWidth = containerWidth - paddingHorizontal * 2;
  const tabWidth = usableWidth / state.routes.length;

  const translateX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    translateX.value = withTiming(state.index * tabWidth, {
      duration: 150,
    });
  }, [state.index, tabWidth]);

  const activeIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          bottom: Math.max(insets.bottom, 12),
          left: TAB_BAR_MARGIN,
          width: containerWidth,
        },
      ]}
    >
      {/* Sliding Active Pill Background */}
      <Animated.View
        style={[
          styles.activePill,
          {
            width: tabWidth,
            left: paddingHorizontal,
          },
          activeIndicatorStyle,
        ]}
      />

      {/* Buttons */}
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'help-circle';
        if (route.name === 'index') iconName = 'notifications';
        else if (route.name === 'search') iconName = 'search';
        else if (route.name === 'saved') iconName = 'bookmark';

        return (
          <TabBarButton
            key={route.key}
            isFocused={isFocused}
            label={label}
            iconName={iconName}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alerts',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderWidth: 1.5,
    borderColor: '#27272a',
    alignItems: 'center',
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  activePill: {
    position: 'absolute',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});