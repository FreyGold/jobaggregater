import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable } from 'react-native';
import styled from 'styled-components/native';

import type { Job, SavedJob, SavedJobStatus } from '@/lib/types';

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SavedJobStatus, { label: string; bg: string; text: string }> = {
  WISHLIST: { label: 'Wishlist', bg: '#27272a', text: '#d4d4d8' },
  APPLIED: { label: 'Applied', bg: '#172554', text: '#60a5fa' },
  INTERVIEWING: { label: 'Interviewing', bg: '#451a03', text: '#fbbf24' },
  OFFERED: { label: 'Offered', bg: '#064e3b', text: '#34d399' },
  REJECTED: { label: 'Rejected', bg: '#450a0a', text: '#f87171' },
};

// ── Styled Components ────────────────────────────────────────────────────────
const CardContainer = styled.View`
  background-color: #18181b;
  border-width: 1px;
  border-color: #27272a;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 12px;
`;

const CardHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const CompanyText = styled.Text`
  color: #71717a;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const JobTitle = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  margin-top: 4px;
`;

const MetaRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const MetaItem = styled.View`
  flex-direction: row;
  align-items: center;
`;

const MetaText = styled.Text`
  color: #71717a;
  font-size: 12px;
  margin-left: 4px;
`;

const TimeAgoText = styled.Text`
  color: #52525b;
  font-size: 12px;
`;

const DescriptionText = styled.Text`
  color: #a1a1aa;
  font-size: 12px;
  margin-top: 12px;
  line-height: 18px;
`;

const ExternalLinkButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top-width: 1px;
  border-top-color: rgba(39, 39, 42, 0.6);
  width: 100%;
`;

const LinkText = styled.Text`
  color: #818cf8;
  font-size: 12px;
  font-weight: 500;
  margin-left: 4px;
`;

const CardFooter = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 12px;
  border-top-width: 1px;
  border-top-color: rgba(39, 39, 42, 0.6);
`;

const StatusBadge = styled.Pressable<{ bg: string }>`
  flex-direction: row;
  align-items: center;
  background-color: ${props => props.bg};
  border-radius: 8px;
  padding-horizontal: 12px;
  padding-vertical: 6px;
`;

const StatusBadgeText = styled.Text<{ textColor: string }>`
  color: ${props => props.textColor};
  font-size: 12px;
  font-weight: 600;
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs) || diffMs < 0) return 'just now';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

interface AlertJobCardProps {
  job: Job;
  isSaved: boolean;
  onSave: (jobId: string) => void;
  onUnsave: (jobId: string) => void;
}

export function AlertJobCard({ job, isSaved, onSave, onUnsave }: AlertJobCardProps) {
  const salary = job.salary;
  return (
    <CardContainer>
      <CardHeader>
        <CompanyText>{job.company}</CompanyText>
        <Pressable
          onPress={() => (isSaved ? onUnsave(job.id) : onSave(job.id))}
          className="p-1"
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? '#6366f1' : '#71717a'}
          />
        </Pressable>
      </CardHeader>

      <JobTitle>{job.title}</JobTitle>

      <MetaRow>
        <MetaItem>
          <Ionicons name="map-outline" size={13} color="#71717a" />
          <MetaText numberOfLines={1}>
            {job.isRemote ? 'Remote' : job.location}
          </MetaText>
        </MetaItem>
        {salary ? (
          <MetaItem>
            <Ionicons name="cash-outline" size={13} color="#71717a" />
            <MetaText>{salary}</MetaText>
          </MetaItem>
        ) : null}
      </MetaRow>

      {job.description ? (
        <DescriptionText numberOfLines={3}>
          {job.description.replace(/<[^>]*>/g, '')}
        </DescriptionText>
      ) : null}

      <ExternalLinkButton
        onPress={() => Linking.openURL(job.url)}
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="open-outline" size={14} color="#6366f1" />
        <LinkText>
          View posting
        </LinkText>
      </ExternalLinkButton>
    </CardContainer>
  );
}

interface SavedJobCardProps {
  job: SavedJob;
  onStatusPress: (job: SavedJob) => void;
  onRemove: (jobId: string) => void;
}

export function SavedJobCard({ job, onStatusPress, onRemove }: SavedJobCardProps) {
  const config = STATUS_CONFIG[job.savedStatus] || STATUS_CONFIG.WISHLIST;
  const salary = job.salary;

  return (
    <CardContainer>
      <CardHeader>
        <CompanyText>{job.company}</CompanyText>
        <Pressable
          onPress={() => onRemove(job.id)}
          className="p-1"
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </Pressable>
      </CardHeader>

      <JobTitle>{job.title}</JobTitle>

      <MetaRow>
        <MetaItem>
          <Ionicons name="map-outline" size={13} color="#71717a" />
          <MetaText numberOfLines={1}>
            {job.isRemote ? 'Remote' : job.location}
          </MetaText>
        </MetaItem>
        {salary ? (
          <MetaItem>
            <Ionicons name="cash-outline" size={13} color="#71717a" />
            <MetaText>{salary}</MetaText>
          </MetaItem>
        ) : null}
        <TimeAgoText>
          Saved {timeAgo(job.savedAt)}
        </TimeAgoText>
      </MetaRow>

      {/* Bottom row: status badge + external link */}
      <CardFooter>
        <StatusBadge
          bg={config.bg}
          onPress={() => onStatusPress(job)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.75 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <StatusBadgeText textColor={config.text}>
            {config.label}
          </StatusBadgeText>
          <Ionicons name="chevron-down" size={14} color="#71717a" style={{ marginLeft: 4 }} />
        </StatusBadge>

        <Pressable
          onPress={() => Linking.openURL(job.url)}
          className="flex-row items-center"
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="open-outline" size={14} color="#6366f1" />
          <LinkText>
            View posting
          </LinkText>
        </Pressable>
      </CardFooter>
    </CardContainer>
  );
}
