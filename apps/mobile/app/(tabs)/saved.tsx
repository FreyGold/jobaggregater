// ─── Saved Jobs Tab ──────────────────────────────────────────────

import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import type { Job } from '@jobagg/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function SavedJobsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedJobs = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get<Job[]>('/api/jobs/saved/list');
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch saved jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const handleUnsave = async (jobId: string) => {
    try {
      await api.delete(`/api/jobs/saved/${jobId}`);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to unsave job');
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.heading}>Sign in to view saved jobs</Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No saved jobs yet</Text>
        <Text style={styles.subtext}>Browse jobs and tap the save button</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardContent}
              onPress={() => router.push(`/job/${item.id}`)}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.company}>{item.company} · {item.location}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.unsaveButton}
              onPress={() => handleUnsave(item.id)}
            >
              <Text style={styles.unsaveText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  list: { padding: 16, gap: 12 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtext: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#111827' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  company: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  unsaveButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unsaveText: { color: '#dc2626', fontWeight: '500', fontSize: 13 },
  signInButton: {
    marginTop: 20,
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
});
