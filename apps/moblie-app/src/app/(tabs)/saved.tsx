import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { EmptyState } from '@/components/EmptyState';
import { SavedJobCard } from '@/components/JobCard';
import { StatusPicker } from '@/components/StatusPicker';
import { fetchSavedJobs, unsaveJob, updateJobStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { SavedJob, SavedJobStatus } from '@/lib/types';

// ── Filter tabs ──────────────────────────────────────────────────────────────
const FILTERS: { key: SavedJobStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'WISHLIST', label: 'Wishlist' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'INTERVIEWING', label: 'Interviewing' },
  { key: 'OFFERED', label: 'Offered' },
  { key: 'REJECTED', label: 'Rejected' },
];

// ── Styled Components ────────────────────────────────────────────────────────
const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: #09090b;
`;

const HeaderContainer = styled.View`
  padding-horizontal: 20px;
  padding-bottom: 12px;
  padding-top: 8px;
`;

const Title = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  letter-spacing: -0.5px;
`;

const Subtitle = styled.Text`
  font-size: 14px;
  color: #71717a;
  margin-top: 2px;
`;

const FilterScroll = styled.ScrollView`
  flex-grow: 0;
  padding-horizontal: 20px;
  padding-vertical: 8px;
`;

const FilterChip = styled.Pressable<{ isActive: boolean }>`
  flex-direction: row;
  align-items: center;
  border-radius: 9999px;
  border-width: 1px;
  border-color: ${props => props.isActive ? '#6366f1' : '#27272a'};
  background-color: ${props => props.isActive ? '#4f46e5' : '#18181b'};
  padding-horizontal: 16px;
  padding-vertical: 6px;
`;

const FilterChipText = styled.Text<{ isActive: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.isActive ? '#ffffff' : '#a1a1aa'};
`;

const CountBadge = styled.View<{ isActive: boolean }>`
  margin-left: 6px;
  border-radius: 9999px;
  background-color: ${props => props.isActive ? '#6366f1' : '#27272a'};
  padding-horizontal: 6px;
  padding-vertical: 2px;
`;

const CountBadgeText = styled.Text<{ isActive: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.isActive ? '#ffffff' : '#71717a'};
`;

const JobsScroll = styled.ScrollView`
  flex: 1;
  padding-horizontal: 20px;
`;

const LoadingContainer = styled(SafeAreaView)`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: #09090b;
`;

const Spacer = styled.View`
  height: 110px;
`;

// ── Screen ───────────────────────────────────────────────────────────────────
export default function SavedScreen() {
  const { signOut } = useAuth();
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SavedJobStatus | 'ALL'>('ALL');
  const [pickerJob, setPickerJob] = useState<SavedJob | null>(null);

  // ── Filtered jobs ─────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    if (activeFilter === 'ALL') return jobs;
    return jobs.filter((j) => j.savedStatus === activeFilter);
  }, [jobs, activeFilter]);

  // Counts per status
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: jobs.length };
    for (const f of FILTERS) {
      if (f.key !== 'ALL') {
        c[f.key] = jobs.filter((j) => j.savedStatus === f.key).length;
      }
    }
    return c;
  }, [jobs]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const res = await fetchSavedJobs();
    if (res.error?.code === 'UNAUTHORIZED') {
      signOut();
      return;
    }
    if (res.data) setJobs(res.data);
  }, [signOut]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleRemove(jobId: string) {
    // Optimistic remove
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    const res = await unsaveJob(jobId);
    if (res.error) {
      // Revert — just refetch
      await loadData();
    }
  }

  async function handleStatusChange(status: SavedJobStatus) {
    if (!pickerJob || pickerJob.savedStatus === status) {
      setPickerJob(null);
      return;
    }

    const jobId = pickerJob.id;

    // Optimistic update
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, savedStatus: status } : j)));
    setPickerJob(null);

    const res = await updateJobStatus(jobId, status);
    if (res.error) {
      await loadData();
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator size="large" color="#6366f1" />
      </LoadingContainer>
    );
  }

  return (
    <Container edges={['top']}>
      {/* Header */}
      <HeaderContainer>
        <Title>Saved Jobs</Title>
        <Subtitle>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} tracked
        </Subtitle>
      </HeaderContainer>

      {/* Filter chips */}
      <FilterScroll
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = counts[f.key] || 0;
          return (
            <FilterChip
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              isActive={isActive}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}>
              <FilterChipText isActive={isActive}>
                {f.label}
              </FilterChipText>
              {count > 0 ? (
                <CountBadge isActive={isActive}>
                  <CountBadgeText isActive={isActive}>
                    {count}
                  </CountBadgeText>
                </CountBadge>
              ) : null}
            </FilterChip>
          );
        })}
      </FilterScroll>

      {/* Content */}
      {filteredJobs.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title={activeFilter === 'ALL' ? 'No saved jobs' : `No ${activeFilter.toLowerCase()} jobs`}
          message={
            activeFilter === 'ALL'
              ? 'Save jobs from the Alerts tab to track your applications here.'
              : 'Jobs with this status will appear here.'
          }
        />
      ) : (
        <JobsScroll
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }>
          {filteredJobs.map((job) => (
            <SavedJobCard
              key={job.id}
              job={job}
              onStatusPress={setPickerJob}
              onRemove={handleRemove}
            />
          ))}

          {/* Bottom spacer for tab bar */}
          <Spacer />
        </JobsScroll>
      )}

      {/* Status picker modal */}
      <StatusPicker
        visible={!!pickerJob}
        currentStatus={pickerJob?.savedStatus || 'WISHLIST'}
        onSelect={handleStatusChange}
        onClose={() => setPickerJob(null)}
      />
    </Container>
  );
}
