import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { AlertJobCard } from '@/components/JobCard';
import { ConfigureAlertsModal } from '@/components/ConfigureAlertsModal';
import {
  fetchAlertHistory,
  fetchSavedJobs,
  saveJob,
  unsaveJob,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AlertHistoryDay, Job } from '@/lib/types';



// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function AlertsScreen() {
  const { signOut } = useAuth();
  const [history, setHistory] = useState<AlertHistoryDay[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Subscription states
  const [showConfigureModal, setShowConfigureModal] = useState(false);


  // Filters state
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [activeDateFilter, setActiveDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'OLDER'>(
    'ALL'
  );
  const [hideSaved, setHideSaved] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Collect all unique keywords for filter chips
  const allKeywords = useMemo(() => {
    const kws = new Set<string>();
    history.forEach((day) => day.keywords.forEach((k) => kws.add(k.keyword)));
    return Array.from(kws);
  }, [history]);

  // Collapsing handler
  const toggleCollapseDate = useCallback((date: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }, []);

  // Filtered data with date, keyword, hide-saved, and search query
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return history
      .map((day) => {
        // Apply date timeframe filter at the day level
        if (activeDateFilter !== 'ALL') {
          if (activeDateFilter === 'TODAY' && day.date !== todayStr) return null;
          if (activeDateFilter === 'YESTERDAY' && day.date !== yesterdayStr) return null;
          if (activeDateFilter === 'OLDER' && (day.date === todayStr || day.date === yesterdayStr))
            return null;
        }

        // Filter keywords and jobs inside the day
        const filteredKeywords = day.keywords
          .map((kwGroup) => {
            // Apply keyword filter
            if (activeKeyword && kwGroup.keyword !== activeKeyword) {
              return null;
            }

            // Filter jobs inside the keyword group
            const filteredJobs = kwGroup.jobs.filter((job) => {
              // Hide saved filter
              if (hideSaved && savedIds.has(job.id)) {
                return false;
              }

              return true;
            });

            if (filteredJobs.length === 0) return null;

            return {
              ...kwGroup,
              jobs: filteredJobs,
            };
          })
          .filter((k): k is Exclude<typeof k, null> => k !== null);

        if (filteredKeywords.length === 0) return null;

        return {
          ...day,
          keywords: filteredKeywords,
        };
      })
      .filter((d): d is Exclude<typeof d, null> => d !== null);
  }, [history, activeKeyword, activeDateFilter, hideSaved, savedIds]);

  // Total job count
  const totalJobs = useMemo(
    () =>
      filteredHistory.reduce(
        (sum, d) => sum + d.keywords.reduce((s, k) => s + k.jobs.length, 0),
        0
      ),
    [filteredHistory]
  );

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
      setError('Failed to load alerts');
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



  // ── Save / Unsave ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async (jobId: string) => {
    // Optimistic update
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
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <View>
          <Text className="text-2xl font-bold tracking-tight text-white">Alerts</Text>
          <Text className="mt-0.5 text-sm text-zinc-500">
            {totalJobs} job{totalJobs !== 1 ? 's' : ''} from your keywords
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {/* Configure Alerts Gear Button */}
          <Pressable
            onPress={() => setShowConfigureModal(true)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
            className="flex-row items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1"
            hitSlop={8}>
            <Ionicons name="settings-outline" size={13} color="#71717a" />
            <Text className="ml-1.5 text-xs font-semibold text-zinc-500">Configure</Text>
          </Pressable>

          {/* Hide Saved Toggle */}
          <Pressable
            onPress={() => setHideSaved(!hideSaved)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
            className={`flex-row items-center rounded-full border px-3 py-1 ${
              hideSaved ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-800 bg-zinc-900'
            }`}>
            <Ionicons
              name={hideSaved ? 'eye-off-outline' : 'eye-outline'}
              size={13}
              color={hideSaved ? '#818cf8' : '#71717a'}
            />
            <Text
              className={`ml-1.5 text-xs font-semibold ${
                hideSaved ? 'text-indigo-400' : 'text-zinc-500'
              }`}>
              Hide Saved
            </Text>
          </Pressable>
          <Pressable
            onPress={signOut}
            className="p-2"
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            })}>
            <Ionicons name="log-out-outline" size={22} color="#71717a" />
          </Pressable>
        </View>
      </View>

      {/* Memoized Alerts Feed */}
      <AlertsFeed
        history={history}
        filteredHistory={filteredHistory}
        allKeywords={allKeywords}
        activeKeyword={activeKeyword}
        setActiveKeyword={setActiveKeyword}
        activeDateFilter={activeDateFilter}
        setActiveDateFilter={setActiveDateFilter}
        collapsedDates={collapsedDates}
        toggleCollapseDate={toggleCollapseDate}
        savedIds={savedIds}
        handleSave={handleSave}
        handleUnsave={handleUnsave}
        refreshing={refreshing}
        onRefresh={onRefresh}
        error={error}
      />

      <ConfigureAlertsModal
        visible={showConfigureModal}
        onClose={() => setShowConfigureModal(false)}
        onRefreshFeed={loadData}
      />
    </SafeAreaView>
  );
}

// ── Memoized Sub-components ──────────────────────────────────────────────────

interface AlertsFeedProps {
  history: AlertHistoryDay[];
  filteredHistory: AlertHistoryDay[];
  allKeywords: string[];
  activeKeyword: string | null;
  setActiveKeyword: (kw: string | null) => void;
  activeDateFilter: 'ALL' | 'TODAY' | 'YESTERDAY' | 'OLDER';
  setActiveDateFilter: (filter: 'ALL' | 'TODAY' | 'YESTERDAY' | 'OLDER') => void;
  collapsedDates: Set<string>;
  toggleCollapseDate: (date: string) => void;
  savedIds: Set<string>;
  handleSave: (id: string) => void;
  handleUnsave: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  error: string;
}

const AlertsFeed = React.memo(function AlertsFeed({
  history,
  filteredHistory,
  allKeywords,
  activeKeyword,
  setActiveKeyword,
  activeDateFilter,
  setActiveDateFilter,
  collapsedDates,
  toggleCollapseDate,
  savedIds,
  handleSave,
  handleUnsave,
  refreshing,
  onRefresh,
  error,
}: AlertsFeedProps) {
  // Flatten feed items dynamically for virtualization
  const flatFeedItems = useMemo(() => {
    const items: (
      | { id: string; type: 'date'; date: string }
      | { id: string; type: 'keyword'; date: string; keyword: string; count: number }
      | { id: string; type: 'job'; date: string; keyword: string; job: Job }
    )[] = [];

    filteredHistory.forEach((day) => {
      const isCollapsed = collapsedDates.has(day.date);
      // Date header row
      items.push({
        id: `date-${day.date}`,
        type: 'date',
        date: day.date,
      });

      if (!isCollapsed) {
        day.keywords.forEach((kwGroup) => {
          // Keyword header row
          items.push({
            id: `keyword-${day.date}-${kwGroup.keyword}`,
            type: 'keyword',
            date: day.date,
            keyword: kwGroup.keyword,
            count: kwGroup.jobs.length,
          });

          // Job card rows
          kwGroup.jobs.forEach((job) => {
            items.push({
              id: `job-${day.date}-${kwGroup.keyword}-${job.id}`,
              type: 'job',
              date: day.date,
              keyword: kwGroup.keyword,
              job,
            });
          });
        });
      }
    });

    return items;
  }, [filteredHistory, collapsedDates]);

  return (
    <>
      {/* Keyword filter chips */}
      {allKeywords.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-none px-5 py-2"
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
          <Ionicons name="search" size={12} color="#71717a" />
          <Pressable
            onPress={() => setActiveKeyword(null)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
            className={`rounded-full border px-4 py-1.5 ${
              activeKeyword === null
                ? 'border-indigo-500 bg-indigo-600'
                : 'border-zinc-800 bg-zinc-900'
            }`}>
            <Text
              className={`text-sm font-medium ${
                activeKeyword === null ? 'text-white' : 'text-zinc-400'
              }`}>
              All Keywords
            </Text>
          </Pressable>
          {allKeywords.map((kw) => (
            <Pressable
              key={kw}
              onPress={() => setActiveKeyword(activeKeyword === kw ? null : kw)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
              className={`rounded-full border px-4 py-1.5 ${
                activeKeyword === kw
                  ? 'border-indigo-500 bg-indigo-600'
                  : 'border-zinc-800 bg-zinc-900'
              }`}>
              <Text
                className={`text-sm font-medium ${
                  activeKeyword === kw ? 'text-white' : 'text-zinc-400'
                }`}>
                {kw}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Timeframe filter chips */}
      {history.length > 0 ? (
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
      ) : filteredHistory.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="No alerts yet"
          message="Set up keyword alerts on the web app or tap Configure above to subscribe."
        />
      ) : (
        <FlatList
          data={flatFeedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.type === 'date') {
              const isCollapsed = collapsedDates.has(item.date);
              return (
                <Pressable
                  onPress={() => toggleCollapseDate(item.date)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                  className="mb-3 flex-row items-center py-1 mt-4">
                  <Ionicons name="calendar-outline" size={14} color="#6366f1" />
                  <Text className="ml-1.5 text-sm font-semibold text-indigo-400">
                    {formatDate(item.date)}
                  </Text>
                  <Ionicons
                    name={isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline'}
                    size={14}
                    color="#6366f1"
                    style={{ marginLeft: 6 }}
                  />
                  <View className="ml-3 h-px flex-1 bg-zinc-800/60" />
                </Pressable>
              );
            }

            if (item.type === 'keyword') {
              return (
                <View className="mb-2 flex-row items-center mt-2">
                  <Ionicons name="search" size={12} color="#71717a" />
                  <Text className="ml-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {item.keyword}
                  </Text>
                  <View className="ml-2 rounded-full bg-zinc-800 px-1.5 py-0.5">
                    <Text className="text-xs font-medium text-zinc-400">
                      {item.count}
                    </Text>
                  </View>
                </View>
              );
            }

            // job card type
            return (
              <AlertJobCard
                job={item.job}
                isSaved={savedIds.has(item.job.id)}
                onSave={handleSave}
                onUnsave={handleUnsave}
              />
            );
          }}
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListFooterComponent={<View className="h-4" />}
        />
      )}
    </>
  );
});
