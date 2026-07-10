import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createAlertSubscription,
  deleteAlertSubscription,
  fetchAlertSubscriptions,
  testAlertSubscription,
} from '@/lib/api';

interface Subscription {
  id: string;
  email: string;
  keywords: string[];
  frequency: 'daily' | 'weekly';
  isActive: boolean;
  createdAt: string;
}

interface ConfigureAlertsModalProps {
  visible: boolean;
  onClose: () => void;
  onRefreshFeed: () => void;
}

export function ConfigureAlertsModal({
  visible,
  onClose,
  onRefreshFeed,
}: ConfigureAlertsModalProps) {
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

  // Load subscriptions from backend
  const loadSubscriptions = useCallback(async () => {
    setFetchingSubscriptions(true);
    try {
      const res = await fetchAlertSubscriptions();
      if (res.data) {
        setSubscriptions(res.data);
        if (res.data.length > 0) {
          const firstEmail = res.data[0].email;
          setNewEmail((prev) => prev || firstEmail);
        }
      }
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setFetchingSubscriptions(false);
    }
  }, []);

  // Reset fields when opening modal
  useEffect(() => {
    if (visible) {
      setNewKeywordInput('');
      setNewKeywords([]);
    }
  }, [visible]);

  const handleCreateSubscription = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
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
        onRefreshFeed();
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
              onRefreshFeed();
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

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      onShow={loadSubscriptions}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="border-zinc-850 max-h-[85%] rounded-t-3xl border-t bg-zinc-900 pb-8">
          {/* Modal Drag Indicator Bar */}
          <View className="items-center py-3">
            <View className="h-1 w-12 rounded-full bg-zinc-800" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-zinc-800/60 px-6 pb-4">
            <Text className="text-lg font-bold text-white">Configure Alerts</Text>
            <Pressable
              onPress={onClose}
              className="rounded-full bg-zinc-800 p-1"
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              })}
            >
              <Ionicons name="close" size={20} color="#a1a1aa" />
            </Pressable>
          </View>

          <ScrollView className="mt-4 px-6" showsVerticalScrollIndicator={false}>
            {/* Form Section */}
            <View className="mb-6">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Create Keyword Alert
              </Text>

              {/* Email Input */}
              <View className="mb-4">
                <Text className="mb-1.5 text-xs text-zinc-500">Notification Email</Text>
                <TextInput
                  placeholder="name@example.com"
                  placeholderTextColor="#52525b"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:outline-none"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Keywords input & chips list */}
              <View className="mb-4">
                <Text className="mb-1.5 text-xs text-zinc-500">Keywords</Text>
                <View className="mb-2 flex-row gap-2">
                  <TextInput
                    placeholder="Add keyword (e.g. react)"
                    placeholderTextColor="#52525b"
                    value={newKeywordInput}
                    onChangeText={setNewKeywordInput}
                    onSubmitEditing={handleAddKeywordTag}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:outline-none"
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={handleAddKeywordTag}
                    className="items-center justify-center rounded-xl bg-indigo-600 px-4"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.75 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    })}
                  >
                    <Ionicons name="add" size={20} color="white" />
                  </Pressable>
                </View>

                {/* Keyword Tags list */}
                {newKeywords.length > 0 ? (
                  <View className="mt-1 flex-row flex-wrap gap-2">
                    {newKeywords.map((kw) => (
                      <View
                        key={kw}
                        className="flex-row items-center rounded-full border border-zinc-700 bg-zinc-800 py-1 pl-3 pr-1.5"
                      >
                        <Text className="mr-1 text-xs font-medium text-zinc-300">
                          {kw}
                        </Text>
                        <Pressable
                          onPress={() => handleRemoveKeywordTag(kw)}
                          className="rounded-full bg-zinc-700 p-0.5"
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.6 : 1,
                          })}
                        >
                          <Ionicons name="close" size={10} color="#a1a1aa" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Frequency picker */}
              <View className="mb-5">
                <Text className="mb-1.5 text-xs text-zinc-500">Frequency</Text>
                <View className="flex-row rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                  {((['daily', 'weekly'] as const)).map((freq) => {
                    const isSelected = newFrequency === freq;
                    return (
                      <Pressable
                        key={freq}
                        onPress={() => setNewFrequency(freq)}
                        className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
                          isSelected ? 'bg-zinc-800' : 'bg-transparent'
                        }`}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.75 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <Text
                          className={`text-xs font-semibold capitalize ${
                            isSelected ? 'text-indigo-400' : 'text-zinc-500'
                          }`}
                        >
                          {freq}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Submit button */}
              <Pressable
                onPress={handleCreateSubscription}
                disabled={submittingAlert}
                className="flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3"
                style={({ pressed }) => ({
                  opacity: pressed || submittingAlert ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                {submittingAlert ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="notifications-outline" size={16} color="white" />
                    <Text className="text-sm font-bold text-white">Create Alert</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Active Alerts List */}
            <View className="mb-8">
              <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Your Active Alerts
              </Text>

              {fetchingSubscriptions ? (
                <View className="items-center justify-center py-6">
                  <ActivityIndicator size="small" color="#6366f1" />
                </View>
              ) : subscriptions.length === 0 ? (
                <View className="border-zinc-850 items-center justify-center rounded-2xl border bg-zinc-950/40 p-6">
                  <Ionicons name="notifications-off-outline" size={24} color="#52525b" />
                  <Text className="mt-2 text-center text-sm text-zinc-500">
                    No active alerts set up yet.
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {subscriptions.map((sub) => (
                    <View
                      key={sub.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <View className="mb-2.5 flex-row items-start justify-between">
                        <View className="mr-2 flex-1">
                          <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                            {sub.email}
                          </Text>
                          <Text className="mt-0.5 text-xs capitalize text-zinc-500">
                            Sends {sub.frequency}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {/* Test Button */}
                          <Pressable
                            onPress={() => handleTestSubscription(sub.id)}
                            disabled={testingId === sub.id}
                            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5"
                            style={({ pressed }) => ({
                              opacity: pressed || testingId === sub.id ? 0.6 : 1,
                              transform: [{ scale: pressed ? 0.95 : 1 }],
                            })}
                          >
                            {testingId === sub.id ? (
                              <ActivityIndicator
                                size="small"
                                color="#6366f1"
                                style={{ transform: [{ scale: 0.8 }] }}
                              />
                            ) : (
                              <Text className="text-xs font-bold text-indigo-400">Test</Text>
                            )}
                          </Pressable>

                          {/* Delete Button */}
                          <Pressable
                            onPress={() => handleDeleteSubscription(sub.id)}
                            disabled={deletingId === sub.id}
                            className="rounded-lg border border-red-900/30 bg-red-950/30 p-1.5"
                            style={({ pressed }) => ({
                              opacity: pressed || deletingId === sub.id ? 0.6 : 1,
                              transform: [{ scale: pressed ? 0.95 : 1 }],
                            })}
                          >
                            {deletingId === sub.id ? (
                              <ActivityIndicator
                                size="small"
                                color="#ef4444"
                                style={{ transform: [{ scale: 0.8 }] }}
                              />
                            ) : (
                              <Ionicons name="trash-outline" size={15} color="#ef4444" />
                            )}
                          </Pressable>
                        </View>
                      </View>

                      {/* Keyword list */}
                      <View className="flex-row flex-wrap gap-1.5">
                        {sub.keywords.map((kw: string) => (
                          <View
                            key={kw}
                            className="rounded-lg border border-zinc-800/80 bg-zinc-900 px-2 py-0.5"
                          >
                            <Text className="text-xs text-zinc-400">{kw}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
