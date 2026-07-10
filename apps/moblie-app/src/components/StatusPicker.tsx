import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable } from 'react-native';
import styled from 'styled-components/native';

import type { SavedJobStatus } from '@/lib/types';

interface StatusPickerProps {
  visible: boolean;
  currentStatus: SavedJobStatus;
  onSelect: (status: SavedJobStatus) => void;
  onClose: () => void;
}

const Overlay = styled.Pressable`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.6);
  justify-content: flex-end;
`;

const Content = styled.Pressable`
  background-color: #09090b;
  border-top-width: 1px;
  border-top-color: #27272a;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding-horizontal: 20px;
  padding-bottom: 32px;
  padding-top: 20px;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const Title = styled.Text`
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
`;

const OptionButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom-width: 1px;
  border-bottom-color: #18181b;
  padding-vertical: 16px;
`;

const OptionText = styled.Text<{ textColor: string }>`
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.textColor};
`;

const STATUSES: { key: SavedJobStatus; label: string; color: string }[] = [
  { key: 'WISHLIST', label: 'Wishlist', color: '#a1a1aa' },
  { key: 'APPLIED', label: 'Applied', color: '#60a5fa' },
  { key: 'INTERVIEWING', label: 'Interviewing', color: '#fbbf24' },
  { key: 'OFFERED', label: 'Offered', color: '#34d399' },
  { key: 'REJECTED', label: 'Rejected', color: '#f87171' },
];

export function StatusPicker({ visible, currentStatus, onSelect, onClose }: StatusPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Overlay onPress={onClose}>
        <Content>
          <HeaderRow>
            <Title>Update Status</Title>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#71717a" />
            </Pressable>
          </HeaderRow>

          {STATUSES.map((s) => {
            const isSelected = s.key === currentStatus;
            return (
              <OptionButton
                key={s.key}
                onPress={() => onSelect(s.key)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <OptionText textColor={s.color}>
                  {s.label}
                </OptionText>
                {isSelected ? (
                  <Ionicons name="checkmark" size={20} color="#6366f1" />
                ) : null}
              </OptionButton>
            );
          })}
        </Content>
      </Overlay>
    </Modal>
  );
}
