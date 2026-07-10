import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8 mt-10">
      <View className="w-16 h-16 rounded-full bg-zinc-900 items-center justify-center mb-4 border border-zinc-800">
        <Ionicons name={icon as any} size={28} color="#71717a" />
      </View>
      <Text className="text-white text-lg font-bold mb-2 text-center">{title}</Text>
      <Text className="text-zinc-500 text-sm text-center max-w-xs">{message}</Text>
    </View>
  );
}
