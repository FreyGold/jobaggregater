import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <SafeAreaView className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      {/* Header */}
      <View className="px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold tracking-tight text-white">Saved Jobs</Text>
        <Text className="mt-0.5 text-sm text-zinc-500">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} tracked
        </Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-none px-5 py-2"
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = counts[f.key] || 0;
          return (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
              className={`flex-row items-center rounded-full border px-4 py-1.5 ${
                isActive ? 'border-indigo-500 bg-indigo-600' : 'border-zinc-800 bg-zinc-900'
              }`}>
              <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                {f.label}
              </Text>
              {count > 0 ? (
                <View
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-indigo-500' : 'bg-zinc-800'
                  }`}>
                  <Text
                    className={`text-xs font-medium ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

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
        <ScrollView
          className="flex-1 px-5"
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
          <View className="h-4" />
        </ScrollView>
      )}

      {/* Status picker modal */}
      <StatusPicker
        visible={!!pickerJob}
        currentStatus={pickerJob?.savedStatus || 'WISHLIST'}
        onSelect={handleStatusChange}
        onClose={() => setPickerJob(null)}
      />
    </SafeAreaView>
  );
}
