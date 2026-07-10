import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import styled from 'styled-components/native';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
}

const Container = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 32px;
  margin-top: 40px;
`;

const IconContainer = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: #18181b;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-width: 1px;
  border-color: #27272a;
`;

const Title = styled.Text`
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
`;

const Message = styled.Text`
  color: #71717a;
  font-size: 14px;
  text-align: center;
  max-width: 280px;
`;

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <Container>
      <IconContainer>
        <Ionicons name={icon as any} size={28} color="#71717a" />
      </IconContainer>
      <Title>{title}</Title>
      <Message>{message}</Message>
    </Container>
  );
}
