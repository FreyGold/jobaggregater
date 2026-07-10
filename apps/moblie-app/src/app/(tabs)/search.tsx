import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { EmptyState } from '@/components/EmptyState';
import { AlertJobCard } from '@/components/JobCard';
import { fetchAlertHistory, fetchSavedJobs, saveJob, unsaveJob } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AlertHistoryDay, Job } from '@/lib/types';

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

const SearchInputWrapper = styled.View`
  padding-horizontal: 20px;
  padding-bottom: 12px;
`;

const SearchBarContainer = styled.View`
  flex-direction: row;
  align-items: center;
  border-radius: 9999px;
  border-width: 1px;
  border-color: #27272a;
  background-color: #18181b;
  padding-horizontal: 14px;
  padding-vertical: 8px;
`;

const StyledTextInput = styled.TextInput`
  margin-left: 10px;
  flex: 1;
  padding-vertical: 0px;
  font-size: 14px;
  color: #ffffff;
`;

const FilterScroll = styled.ScrollView`
  flex-grow: 0;
  padding-horizontal: 20px;
  padding-bottom: 12px;
`;

const FilterChip = styled.Pressable<{ isActive: boolean }>`
  border-radius: 9999px;
  border-width: 1px;
  border-color: ${props => props.isActive ? '#3f3f46' : '#27272a'};
  background-color: ${props => props.isActive ? '#27272a' : '#18181b'};
  padding-horizontal: 12px;
  padding-vertical: 6px;
`;

const FilterChipText = styled.Text<{ isActive: boolean }>`
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

export default function SearchScreen() {
  const { signOut } = useAuth();
  const [history, setHistory] = useState<AlertHistoryDay[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters state
  const [activeDateFilter, setActiveDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'OLDER'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [historyRes, savedRes] = await Promise.all([fetchAlertHistory(), fetchSavedJobs()]);

      if (historyRes.error?.code === 'UNAUTHORIZED') {
        signOut();
        return;
      }

      if (historyRes.data) setHistory(historyRes.data);
      if (savedRes.data) {
        setSavedIds(new Set(savedRes.data.map((j) => j.id)));
      }
      setError('');
    } catch {
      setError('Failed to load jobs');
    }
  }, [signOut]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Flatten all jobs from history, remove duplicates, sort newest first
  const allJobs = useMemo(() => {
    const jobsMap = new Map<string, Job & { date: string }>();
    history.forEach((day) => {
      day.keywords.forEach((kwGroup) => {
        kwGroup.jobs.forEach((job) => {
          if (!jobsMap.has(job.id)) {
            jobsMap.set(job.id, { ...job, date: day.date });
          }
        });
      });
    });
    return Array.from(jobsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [history]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return allJobs.filter((job) => {
      // 1. Date timeframe filter
      if (activeDateFilter !== 'ALL') {
        if (activeDateFilter === 'TODAY' && job.date !== todayStr) return false;
        if (activeDateFilter === 'YESTERDAY' && job.date !== yesterdayStr) return false;
        if (activeDateFilter === 'OLDER' && (job.date === todayStr || job.date === yesterdayStr))
          return false;
      }

      // 2. Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = job.title.toLowerCase().includes(query);
        const companyMatch = job.company.toLowerCase().includes(query);
        const descMatch = job.description?.toLowerCase().includes(query) || false;
        return titleMatch || companyMatch || descMatch;
      }

      return true;
    });
  }, [allJobs, activeDateFilter, searchQuery]);

  // ── Save / Unsave ─────────────────────────────────────────────────────────
  async function handleSave(jobId: string) {
    setSavedIds((prev) => new Set(prev).add(jobId));
    const res = await saveJob(jobId);
    if (res.error) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }

  async function handleUnsave(jobId: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    const res = await unsaveJob(jobId);
    if (res.error) {
      setSavedIds((prev) => new Set(prev).add(jobId));
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
        <Title>Search</Title>
        <Subtitle>
          Search {allJobs.length} accumulated job postings
        </Subtitle>
      </HeaderContainer>

      {/* Search Input Bar */}
      <SearchInputWrapper>
        <SearchBarContainer>
          <Ionicons name="search-outline" size={16} color="#71717a" />
          <StyledTextInput
            placeholder="Search title, company, description..."
            placeholderTextColor="#52525b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              })}>
              <Ionicons name="close-circle" size={18} color="#71717a" />
            </Pressable>
          ) : null}
        </SearchBarContainer>
      </SearchInputWrapper>

      {/* Timeframe filter chips */}
      {allJobs.length > 0 ? (
        <FilterScroll
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={12} color="#71717a" />
          {[
            { key: 'ALL', label: 'All Time' },
            { key: 'TODAY', label: 'Today' },
            { key: 'YESTERDAY', label: 'Yesterday' },
            { key: 'OLDER', label: 'Older' },
          ].map((item) => {
            const isActive = activeDateFilter === item.key;
            return (
              <FilterChip
                key={item.key}
                onPress={() => setActiveDateFilter(item.key as any)}
                isActive={isActive}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}>
                <FilterChipText isActive={isActive}>
                  {item.label}
                </FilterChipText>
              </FilterChip>
            );
          })}
        </FilterScroll>
      ) : null}

      {/* Content */}
      {error ? (
        <EmptyState icon="warning-outline" title="Something went wrong" message={error} />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No jobs found"
          message={
            searchQuery
              ? 'Try adjusting your search query or timeframe filters.'
              : 'No jobs are currently indexed.'
          }
        />
      ) : (
        <JobsScroll
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }>
          {filteredJobs.map((job) => (
            <AlertJobCard
              key={job.id}
              job={job}
              isSaved={savedIds.has(job.id)}
              onSave={handleSave}
              onUnsave={handleUnsave}
            />
          ))}

          {/* Bottom spacer for tab bar */}
          <Spacer />
        </JobsScroll>
      )}
    </Container>
  );
}
