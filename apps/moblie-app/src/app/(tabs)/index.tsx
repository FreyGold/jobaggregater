import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Modal,
  Alert,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';

import { EmptyState } from '@/components/EmptyState';
import { AlertJobCard } from '@/components/JobCard';
import {
  createAlertSubscription,
  deleteAlertSubscription,
  fetchAlertHistory,
  fetchAlertSubscriptions,
  fetchSavedJobs,
  saveJob,
  testAlertSubscription,
  unsaveJob,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AlertHistoryDay, Job } from '@/lib/types';

interface Subscription {
  id: string;
  email: string;
  keywords: string[];
  frequency: 'daily' | 'weekly';
  isActive: boolean;
  createdAt: string;
}

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

// ── Styled Components ────────────────────────────────────────────────────────
const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: #09090b;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-horizontal: 20px;
  padding-bottom: 12px;
  padding-top: 8px;
`;

const HeaderTitle = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  letter-spacing: -0.5px;
`;

const HeaderSub = styled.Text`
  font-size: 14px;
  color: #71717a;
  margin-top: 2px;
`;

const ButtonGroup = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const ConfigureButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  border-radius: 9999px;
  border-width: 1px;
  border-color: #27272a;
  background-color: #18181b;
  padding-horizontal: 12px;
  padding-vertical: 6px;
`;

const ConfigureButtonText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: #71717a;
  margin-left: 6px;
`;

const LogOutButton = styled.Pressable`
  padding: 8px;
`;

const FiltersScroll = styled.ScrollView`
  flex-grow: 0;
  padding-horizontal: 20px;
  padding-vertical: 8px;
`;

const KeywordChip = styled.Pressable<{ isActive: boolean }>`
  border-radius: 9999px;
  border-width: 1px;
  border-color: ${props => props.isActive ? '#6366f1' : '#27272a'};
  background-color: ${props => props.isActive ? '#4f46e5' : '#18181b'};
  padding-horizontal: 16px;
  padding-vertical: 6px;
`;

const KeywordChipText = styled.Text<{ isActive: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.isActive ? '#ffffff' : '#a1a1aa'};
`;

const TimeframeChip = styled.Pressable<{ isActive: boolean }>`
  border-radius: 9999px;
  border-width: 1px;
  border-color: ${props => props.isActive ? '#3f3f46' : '#27272a'};
  background-color: ${props => props.isActive ? '#27272a' : '#18181b'};
  padding-horizontal: 12px;
  padding-vertical: 6px;
`;

const TimeframeChipText = styled.Text<{ isActive: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.isActive ? '#ffffff' : '#71717a'};
`;

const ScrollContainer = styled.ScrollView`
  flex: 1;
  padding-horizontal: 20px;
`;

const GroupContainer = styled.View`
  margin-bottom: 24px;
`;

const DatePressable = styled.Pressable`
  margin-bottom: 12px;
  flex-direction: row;
  align-items: center;
  padding-vertical: 4px;
`;

const DateText = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: #818cf8;
  margin-left: 6px;
`;

const DividerLine = styled.View`
  margin-left: 12px;
  height: 1px;
  flex: 1;
  background-color: rgba(39, 39, 42, 0.6);
`;

const KeywordGroupContainer = styled.View`
  margin-bottom: 16px;
`;

const KeywordGroupHeader = styled.View`
  margin-bottom: 8px;
  flex-direction: row;
  align-items: center;
`;

const KeywordGroupText = styled.Text`
  margin-left: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #71717a;
`;

const Badge = styled.View`
  margin-left: 8px;
  border-radius: 9999px;
  background-color: #27272a;
  padding-horizontal: 6px;
  padding-vertical: 2px;
`;

const BadgeText = styled.Text`
  font-size: 12px;
  font-weight: 500;
  color: #a1a1aa;
`;

const BottomSpacer = styled.View`
  height: 110px;
`;

// Modal Styles
const ModalOverlay = styled.View`
  flex: 1;
  justify-content: flex-end;
  background-color: rgba(0, 0, 0, 0.6);
`;

const ModalContent = styled.View`
  border-top-width: 1px;
  border-top-color: #27272a;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  background-color: #18181b;
  padding-bottom: 32px;
  max-height: 85%;
`;

const ModalDragIndicatorContainer = styled.View`
  align-items: center;
  padding-vertical: 12px;
`;

const ModalDragIndicator = styled.View`
  height: 4px;
  width: 48px;
  border-radius: 9999px;
  background-color: #27272a;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom-width: 1px;
  border-bottom-color: rgba(39, 39, 42, 0.6);
  padding-horizontal: 24px;
  padding-bottom: 16px;
`;

const ModalTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
`;

const ModalCloseButton = styled.Pressable`
  border-radius: 9999px;
  background-color: #27272a;
  padding: 4px;
`;

const ModalFormScroll = styled.ScrollView`
  margin-top: 16px;
  padding-horizontal: 24px;
`;

const FormSection = styled.View`
  margin-bottom: 24px;
`;

const SectionLabel = styled.Text`
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a1a1aa;
`;

const FormGroup = styled.View`
  margin-bottom: 16px;
`;

const FieldLabel = styled.Text`
  margin-bottom: 6px;
  font-size: 12px;
  color: #71717a;
`;

const StyledTextInput = styled.TextInput`
  border-radius: 12px;
  border-width: 1px;
  border-color: #27272a;
  background-color: #09090b;
  padding-horizontal: 16px;
  padding-vertical: 12px;
  font-size: 14px;
  color: #ffffff;
`;

const RowInputGroup = styled.View`
  margin-bottom: 8px;
  flex-direction: row;
  gap: 8px;
`;

const AddButton = styled.Pressable`
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background-color: #4f46e5;
  padding-horizontal: 16px;
`;

const TagsList = styled.View`
  margin-top: 4px;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const TagBadge = styled.View`
  flex-direction: row;
  align-items: center;
  border-radius: 9999px;
  border-width: 1px;
  border-color: #3f3f46;
  background-color: #27272a;
  padding-vertical: 4px;
  padding-left: 12px;
  padding-right: 6px;
`;

const TagBadgeText = styled.Text`
  margin-right: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #d4d4d8;
`;

const TagCloseButton = styled.Pressable`
  border-radius: 9999px;
  background-color: #3f3f46;
  padding: 2px;
`;

const SegmentGroup = styled.View`
  flex-direction: row;
  border-radius: 12px;
  border-width: 1px;
  border-color: #27272a;
  background-color: #09090b;
  padding: 4px;
`;

const SegmentButton = styled.Pressable<{ isSelected: boolean }>`
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding-vertical: 10px;
  background-color: ${props => props.isSelected ? '#27272a' : 'transparent'};
`;

const SegmentButtonText = styled.Text<{ isSelected: boolean }>`
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${props => props.isSelected ? '#818cf8' : '#71717a'};
`;

const SubmitButton = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  background-color: #4f46e5;
  padding-vertical: 12px;
`;

const SubmitButtonText = styled.Text`
  font-size: 14px;
  font-weight: bold;
  color: #ffffff;
`;

const ActiveAlertContainer = styled.View`
  border-radius: 16px;
  border-width: 1px;
  border-color: #27272a;
  background-color: #09090b;
  padding: 16px;
  margin-bottom: 12px;
`;

const ActiveAlertHeader = styled.View`
  margin-bottom: 10px;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
`;

const ActiveAlertMeta = styled.View`
  margin-right: 8px;
  flex: 1;
`;

const ActiveAlertEmail = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
`;

const ActiveAlertFreq = styled.Text`
  margin-top: 2px;
  font-size: 12px;
  text-transform: capitalize;
  color: #71717a;
`;

const ActionRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const TestButton = styled.Pressable`
  border-radius: 8px;
  border-width: 1px;
  border-color: #27272a;
  background-color: #18181b;
  padding-horizontal: 10px;
  padding-vertical: 6px;
`;

const TestButtonText = styled.Text`
  font-size: 12px;
  font-weight: bold;
  color: #818cf8;
`;

const DeleteAlertButton = styled.Pressable`
  border-radius: 8px;
  border-width: 1px;
  border-color: rgba(239, 68, 68, 0.3);
  background-color: rgba(239, 68, 68, 0.1);
  padding: 6px;
`;

const LoadingContainer = styled(SafeAreaView)`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: #09090b;
`;

const PreferenceRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: #09090b;
  border-width: 1px;
  border-color: #27272a;
  border-radius: 12px;
  padding-horizontal: 16px;
  padding-vertical: 12px;
  margin-bottom: 8px;
`;

const PreferenceLabelContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const PreferenceText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const PreferenceToggle = styled.View<{ isActive: boolean }>`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: ${props => props.isActive ? '#4f46e5' : '#27272a'};
  padding: 2px;
  justify-content: center;
`;

const PreferenceToggleInner = styled.View<{ isActive: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: #ffffff;
  align-self: ${props => props.isActive ? 'flex-end' : 'flex-start'};
`;

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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(false);
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly'>('daily');

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
  const toggleCollapseDate = (date: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

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

  const loadSubscriptions = useCallback(async () => {
    setFetchingSubscriptions(true);
    try {
      const res = await fetchAlertSubscriptions();
      if (res.data) setSubscriptions(res.data);
    } catch {
      // Ignored
    } finally {
      setFetchingSubscriptions(false);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    if (showConfigureModal) {
      const timer = setTimeout(() => {
        loadSubscriptions();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [showConfigureModal, loadSubscriptions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    if (showConfigureModal) {
      await loadSubscriptions();
    }
    setRefreshing(false);
  }, [loadData, loadSubscriptions, showConfigureModal]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCreateSubscription = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address.');
      return;
    }
    if (newKeywords.length === 0) {
      Alert.alert('Error', 'Please add at least one keyword.');
      return;
    }

    setSubmittingAlert(true);
    try {
      const res = await createAlertSubscription(newEmail.trim(), newKeywords, newFrequency);
      if (res.error) {
        Alert.alert('Error', res.error.message || 'Failed to create subscription.');
      } else {
        setNewKeywords([]);
        setNewKeywordInput('');
        loadSubscriptions();
        loadData();
        Alert.alert('Success', 'Alert subscription created!');
      }
    } catch {
      Alert.alert('Error', 'Failed to create subscription.');
    } finally {
      setSubmittingAlert(false);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    Alert.alert('Delete Alert', 'Are you sure you want to delete this alert subscription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            const res = await deleteAlertSubscription(id);
            if (res.error) {
              Alert.alert('Error', res.error.message || 'Failed to delete subscription.');
            } else {
              loadSubscriptions();
              loadData();
            }
          } catch {
            Alert.alert('Error', 'Failed to delete subscription.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleTestSubscription = async (id: string) => {
    setTestingId(id);
    try {
      const res = await testAlertSubscription(id);
      if (res.error) {
        Alert.alert('Error', res.error.message || 'Failed to send test alert.');
      } else {
        Alert.alert('Success', 'Test email sent! Please check your inbox.');
      }
    } catch {
      Alert.alert('Error', 'Failed to send test alert.');
    } finally {
      setTestingId(null);
    }
  };

  const handleAddKeywordTag = () => {
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (!trimmed) return;
    if (newKeywords.includes(trimmed)) {
      setNewKeywordInput('');
      return;
    }
    setNewKeywords([...newKeywords, trimmed]);
    setNewKeywordInput('');
  };

  const handleRemoveKeywordTag = (keyword: string) => {
    setNewKeywords(newKeywords.filter((k) => k !== keyword));
  };

  // ── Save / Unsave ─────────────────────────────────────────────────────────
  async function handleSave(jobId: string) {
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
      <HeaderRow>
        <View>
          <HeaderTitle>Alerts</HeaderTitle>
          <HeaderSub>
            {totalJobs} job{totalJobs !== 1 ? 's' : ''} from your keywords
          </HeaderSub>
        </View>
        <ButtonGroup>
          {/* Configure Alerts Gear Button */}
          <ConfigureButton
            onPress={() => setShowConfigureModal(true)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
            hitSlop={8}>
            <Ionicons name="settings-outline" size={13} color="#71717a" />
            <ConfigureButtonText>Configure</ConfigureButtonText>
          </ConfigureButton>

          <LogOutButton
            onPress={signOut}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            })}>
            <Ionicons name="log-out-outline" size={22} color="#71717a" />
          </LogOutButton>
        </ButtonGroup>
      </HeaderRow>

      {/* Keyword filter chips */}
      {allKeywords.length > 0 ? (
        <FiltersScroll
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
          <Ionicons name="search" size={12} color="#71717a" />
          <KeywordChip
            onPress={() => setActiveKeyword(null)}
            isActive={activeKeyword === null}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}>
            <KeywordChipText isActive={activeKeyword === null}>
              All Keywords
            </KeywordChipText>
          </KeywordChip>
          {allKeywords.map((kw) => (
            <KeywordChip
              key={kw}
              onPress={() => setActiveKeyword(activeKeyword === kw ? null : kw)}
              isActive={activeKeyword === kw}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}>
              <KeywordChipText isActive={activeKeyword === kw}>
                {kw}
              </KeywordChipText>
            </KeywordChip>
          ))}
        </FiltersScroll>
      ) : null}

      {/* Timeframe filter chips */}
      {history.length > 0 ? (
        <FiltersScroll
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
              <TimeframeChip
                key={item.key}
                onPress={() => setActiveDateFilter(item.key as any)}
                isActive={isActive}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}>
                <TimeframeChipText isActive={isActive}>
                  {item.label}
                </TimeframeChipText>
              </TimeframeChip>
            );
          })}
        </FiltersScroll>
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
        <ScrollContainer
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }>
          {filteredHistory.map((day) => {
            const isCollapsed = collapsedDates.has(day.date);
            return (
              <GroupContainer key={day.date}>
                {/* Date header (Pressable to collapse) */}
                <DatePressable
                  onPress={() => toggleCollapseDate(day.date)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Ionicons name="calendar-outline" size={14} color="#6366f1" />
                  <DateText>
                    {formatDate(day.date)}
                  </DateText>
                  <Ionicons
                    name={isCollapsed ? 'chevron-forward-outline' : 'chevron-down-outline'}
                    size={14}
                    color="#6366f1"
                    style={{ marginLeft: 6 }}
                  />
                  <DividerLine />
                </DatePressable>

                {/* Keyword groups (hidden if collapsed) */}
                {!isCollapsed &&
                  day.keywords.map((kwGroup) => (
                    <KeywordGroupContainer key={`${day.date}-${kwGroup.keyword}`}>
                      <KeywordGroupHeader>
                        <Ionicons name="search" size={12} color="#71717a" />
                        <KeywordGroupText>
                          {kwGroup.keyword}
                        </KeywordGroupText>
                        <Badge>
                          <BadgeText>
                            {kwGroup.jobs.length}
                          </BadgeText>
                        </Badge>
                      </KeywordGroupHeader>

                      {kwGroup.jobs.map((job: Job) => (
                        <AlertJobCard
                          key={job.id}
                          job={job}
                          isSaved={savedIds.has(job.id)}
                          onSave={handleSave}
                          onUnsave={handleUnsave}
                        />
                      ))}
                    </KeywordGroupContainer>
                  ))}
              </GroupContainer>
            );
          })}

          {/* Bottom spacer for tab bar */}
          <BottomSpacer />
        </ScrollContainer>
      )}

      {/* Configure Alerts Bottom Sheet Modal */}
      {showConfigureModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showConfigureModal}
          onRequestClose={() => setShowConfigureModal(false)}>
          <ModalOverlay>
            <Pressable style={{ flex: 1 }} onPress={() => setShowConfigureModal(false)} />
            <ModalContent>
              {/* Modal Drag Indicator Bar */}
              <ModalDragIndicatorContainer>
                <ModalDragIndicator />
              </ModalDragIndicatorContainer>

              {/* Header */}
              <ModalHeader>
                <ModalTitle>Configure Alerts</ModalTitle>
                <ModalCloseButton
                  onPress={() => setShowConfigureModal(false)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  })}>
                  <Ionicons name="close" size={20} color="#a1a1aa" />
                </ModalCloseButton>
              </ModalHeader>

              <ModalFormScroll showsVerticalScrollIndicator={false}>
                {/* General Settings Section */}
                <FormSection>
                  <SectionLabel>General Settings</SectionLabel>
                  <PreferenceRow onPress={() => setHideSaved(!hideSaved)}>
                    <PreferenceLabelContainer>
                      <Ionicons
                        name={hideSaved ? 'eye-off' : 'eye'}
                        size={18}
                        color={hideSaved ? '#818cf8' : '#71717a'}
                      />
                      <PreferenceText>Hide Saved Jobs</PreferenceText>
                    </PreferenceLabelContainer>
                    <PreferenceToggle isActive={hideSaved}>
                      <PreferenceToggleInner isActive={hideSaved} />
                    </PreferenceToggle>
                  </PreferenceRow>
                </FormSection>

                {/* Form Section */}
                <FormSection>
                  <SectionLabel>
                    Create Keyword Alert
                  </SectionLabel>

                  {/* Email Input */}
                  <FormGroup>
                    <FieldLabel>Notification Email</FieldLabel>
                    <StyledTextInput
                      placeholder="name@example.com"
                      placeholderTextColor="#52525b"
                      value={newEmail}
                      onChangeText={setNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </FormGroup>

                  {/* Keywords input & chips list */}
                  <FormGroup>
                    <FieldLabel>Keywords</FieldLabel>
                    <RowInputGroup>
                      <StyledTextInput
                        placeholder="Add keyword (e.g. react)"
                        placeholderTextColor="#52525b"
                        value={newKeywordInput}
                        onChangeText={setNewKeywordInput}
                        onSubmitEditing={handleAddKeywordTag}
                        autoCapitalize="none"
                        style={{ flex: 1 }}
                      />
                      <AddButton
                        onPress={handleAddKeywordTag}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.75 : 1,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        })}>
                        <Ionicons name="add" size={20} color="white" />
                      </AddButton>
                    </RowInputGroup>

                    {/* Keyword Tags list */}
                    {newKeywords.length > 0 ? (
                      <TagsList>
                        {newKeywords.map((kw) => (
                          <TagBadge key={kw}>
                            <TagBadgeText>{kw}</TagBadgeText>
                            <TagCloseButton
                              onPress={() => handleRemoveKeywordTag(kw)}
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.6 : 1,
                              })}>
                              <Ionicons name="close" size={10} color="#a1a1aa" />
                            </TagCloseButton>
                          </TagBadge>
                        ))}
                      </TagsList>
                    ) : null}
                  </FormGroup>

                  {/* Frequency picker */}
                  <FormGroup style={{ marginBottom: 20 }}>
                    <FieldLabel>Frequency</FieldLabel>
                    <SegmentGroup>
                      {(['daily', 'weekly'] as const).map((freq) => {
                        const isSelected = newFrequency === freq;
                        return (
                          <SegmentButton
                            key={freq}
                            onPress={() => setNewFrequency(freq)}
                            isSelected={isSelected}
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.75 : 1,
                              transform: [{ scale: pressed ? 0.98 : 1 }],
                            })}>
                            <SegmentButtonText isSelected={isSelected}>
                              {freq}
                            </SegmentButtonText>
                          </SegmentButton>
                        );
                      })}
                    </SegmentGroup>
                  </FormGroup>

                  {/* Submit button */}
                  <SubmitButton
                    onPress={handleCreateSubscription}
                    disabled={submittingAlert}
                    style={({ pressed }) => ({
                      opacity: pressed || submittingAlert ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}>
                    {submittingAlert ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="notifications-outline" size={16} color="white" />
                        <SubmitButtonText>Create Alert</SubmitButtonText>
                      </>
                    )}
                  </SubmitButton>
                </FormSection>

                {/* Active Alerts List */}
                <FormSection style={{ marginBottom: 32 }}>
                  <SectionLabel>
                    Your Active Alerts
                  </SectionLabel>

                  {fetchingSubscriptions ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                      <ActivityIndicator size="small" color="#6366f1" />
                    </View>
                  ) : subscriptions.length === 0 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#27272a', backgroundColor: '#09090b', padding: 24 }}>
                      <Ionicons name="notifications-off-outline" size={24} color="#52525b" />
                      <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 14, color: '#71717a' }}>
                        No active alerts set up yet.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {subscriptions.map((sub) => (
                        <ActiveAlertContainer key={sub.id}>
                          <ActiveAlertHeader>
                            <ActiveAlertMeta>
                              <ActiveAlertEmail numberOfLines={1}>
                                {sub.email}
                              </ActiveAlertEmail>
                              <ActiveAlertFreq>
                                Sends {sub.frequency}
                              </ActiveAlertFreq>
                            </ActiveAlertMeta>

                            <ActionRow>
                              {/* Test Button */}
                              <TestButton
                                onPress={() => handleTestSubscription(sub.id)}
                                disabled={testingId === sub.id}
                                style={({ pressed }) => ({
                                  opacity: pressed || testingId === sub.id ? 0.6 : 1,
                                  transform: [{ scale: pressed ? 0.95 : 1 }],
                                })}>
                                {testingId === sub.id ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#6366f1"
                                    style={{ transform: [{ scale: 0.8 }] }}
                                  />
                                ) : (
                                  <TestButtonText>Test</TestButtonText>
                                )}
                              </TestButton>

                              {/* Delete Button */}
                              <DeleteAlertButton
                                onPress={() => handleDeleteSubscription(sub.id)}
                                disabled={deletingId === sub.id}
                                style={({ pressed }) => ({
                                  opacity: pressed || deletingId === sub.id ? 0.6 : 1,
                                  transform: [{ scale: pressed ? 0.95 : 1 }],
                                })}>
                                {deletingId === sub.id ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#ef4444"
                                    style={{ transform: [{ scale: 0.8 }] }}
                                  />
                                ) : (
                                  <Ionicons name="trash-outline" size={15} color="#ef4444" />
                                )}
                              </DeleteAlertButton>
                            </ActionRow>
                          </ActiveAlertHeader>

                          {/* Keyword list */}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {sub.keywords.map((kw: string) => (
                              <View
                                key={kw}
                                style={{ borderRadius: 8, borderWidth: 1, borderColor: '#27272a', backgroundColor: '#18181b', paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 12, color: '#a1a1aa' }}>{kw}</Text>
                              </View>
                            ))}
                          </View>
                        </ActiveAlertContainer>
                      ))}
                    </View>
                  )}
                </FormSection>
              </ModalFormScroll>
            </ModalContent>
          </ModalOverlay>
        </Modal>
      )}
    </Container>
  );
}
