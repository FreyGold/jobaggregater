// ─── Jobs Feed Tab ───────────────────────────────────────────────

import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type { Job } from '@jobagg/shared';
import { api } from '../../lib/api';

export default function JobsFeedScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        // Using Type parameter { data: Job[] } based on standard pagination
        const res = await api.get<{ data: Job[] }>('/api/jobs');
        setJobs(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
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
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/job/${item.id}`)}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.company}>{item.company} · {item.location}</Text>
            {item.salaryMax ? ( // Show max salary roughly or currency
               <Text style={styles.salary}>{item.salaryCurrency || '$'}{item.salaryMax}</Text>
            ) : item.salaryMin ? (
               <Text style={styles.salary}>{item.salaryCurrency || '$'}{item.salaryMin}</Text>
            ) : null}
            <Text style={styles.date}>{new Date(item.postedAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  company: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  salary: { fontSize: 13, color: '#6366f1', marginTop: 8, fontWeight: '500' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
});
