// ─── Saved Jobs Tab ──────────────────────────────────────────────

import { View, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import type { Job } from '@jobagg/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { JobCard } from '../../components/ui/JobCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { THEME } from '../../lib/theme';
import { BookmarkMinus, LogIn } from 'lucide-react-native';

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

  const handleUnsave = async (jobId: string, currentlySaved: boolean) => {
    try {
      // Optimitic update
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      await api.delete(`/api/jobs/saved/${jobId}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove job');
      fetchSavedJobs(); // Revert on fail
    }
  };

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={<LogIn color={THEME.colors.textSecondary} size={32} />}
        title="Sign in required"
        description="Log in or create an account to view and manage your saved jobs across platforms."
        action={<Button title="Sign In" onPress={() => router.push('/(auth)/login')} />}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkMinus color={THEME.colors.textSecondary} size={32} />}
        title="No saved jobs"
        description="Jobs you save will appear here so you can review and apply to them later."
        action={
          <Button 
            title="Browse Jobs" 
            variant="outline" 
            onPress={() => router.navigate('/(tabs)/index')} 
          />
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <JobCard 
            job={item} 
            isSaved={true} 
            onSaveToggle={handleUnsave} 
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: THEME.layout.padding, gap: 12 },
});
