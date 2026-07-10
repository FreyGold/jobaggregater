import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { AlertJobCard } from '@/components/JobCard';
import { fetchAlertHistory, fetchSavedJobs, saveJob, unsaveJob } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AlertHistoryDay, Job } from '@/lib/types';

export default function SearchScreen() {
  const { signOut } = useAuth();
  const [history, setHistory] = useState<AlertHistoryDay[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [activeDateFilter, setActiveDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'OLDER'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

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
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const titleMatch = job.title.toLowerCase().includes(query);
        const companyMatch = job.company.toLowerCase().includes(query);
        const descMatch = job.description?.toLowerCase().includes(query) || false;
        return titleMatch || companyMatch || descMatch;
      }

      return true;
    });
  }, [allJobs, activeDateFilter, debouncedSearchQuery]);

  // ── Save / Unsave ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async (jobId: string) => {
    setSavedIds((prev) => new Set(prev).add(jobId));
    const res = await saveJob(jobId);
    if (res.error) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }, []);

  const handleUnsave = useCallback(async (jobId: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    const res = await unsaveJob(jobId);
    if (res.error) {
      setSavedIds((prev) => new Set(prev).add(jobId));
    }
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold tracking-tight text-white">Search</Text>
        <Text className="mt-0.5 text-sm text-zinc-500">
          Search {allJobs.length} accumulated job postings
        </Text>
      </View>

      {/* Search Input Bar */}
      <View className="px-5 pb-3">
        <View className="flex-row items-center rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-2">
          <Ionicons name="search-outline" size={16} color="#71717a" />
          <TextInput
            placeholder="Search title, company, description..."
            placeholderTextColor="#52525b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="ml-2.5 flex-1 py-0 text-sm text-white focus:outline-none"
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
        </View>
      </View>

      {/* Timeframe filter chips */}
      {allJobs.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-none px-5 pb-3"
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
              <Pressable
                key={item.key}
                onPress={() => setActiveDateFilter(item.key as any)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
                className={`rounded-full border px-3 py-1.5 ${
                  isActive ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-800 bg-zinc-900'
                }`}>
                <Text
                  className={`text-xs font-medium ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AlertJobCard
              job={item}
              isSaved={savedIds.has(item.id)}
              onSave={handleSave}
              onUnsave={handleUnsave}
            />
          )}
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListFooterComponent={<View className="h-4" />}
        />
      )}
    </SafeAreaView>
  );
}
