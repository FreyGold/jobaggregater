import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import type { SavedJobStatus } from '@/lib/types';

interface StatusPickerProps {
  visible: boolean;
  currentStatus: SavedJobStatus;
  onSelect: (status: SavedJobStatus) => void;
  onClose: () => void;
}

const STATUSES: { key: SavedJobStatus; label: string; color: string }[] = [
  { key: 'WISHLIST', label: 'Wishlist', color: 'text-zinc-400' },
  { key: 'APPLIED', label: 'Applied', color: 'text-blue-400' },
  { key: 'INTERVIEWING', label: 'Interviewing', color: 'text-amber-400' },
  { key: 'OFFERED', label: 'Offered', color: 'text-emerald-400' },
  { key: 'REJECTED', label: 'Rejected', color: 'text-red-400' },
];

export function StatusPicker({ visible, currentStatus, onSelect, onClose }: StatusPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <Pressable className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-5 pb-8 pt-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-bold">Update Status</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#71717a" />
            </Pressable>
          </View>

          {STATUSES.map((s) => {
            const isSelected = s.key === currentStatus;
            return (
              <Pressable
                key={s.key}
                onPress={() => onSelect(s.key)}
                className="flex-row items-center justify-between border-b border-zinc-900 py-4"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text className={`text-base font-medium ${s.color}`}>
                  {s.label}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark" size={20} color="#6366f1" />
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
