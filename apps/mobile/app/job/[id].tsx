// ─── Job Detail Screen ───────────────────────────────────────────

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import type { Job } from '@jobagg/shared';
import { api } from '../../lib/api';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      try {
        setLoading(true);
        const res = await api.get<{ data: Job }>(`/api/jobs/${id}`);
        setJob(res.data?.data || null);
      } catch (err) {
        console.error('Failed to fetch job:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchJob();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.placeholder}>Job not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.company}>{job.company} · {job.location}</Text>
      {job.salaryMax ? ( 
        <Text style={styles.salary}>{job.salaryCurrency || '$'}{job.salaryMax}</Text>
      ) : job.salaryMin ? (
        <Text style={styles.salary}>{job.salaryCurrency || '$'}{job.salaryMin}</Text>
      ) : null}
      
      <Text style={styles.placeholder}>
        {job.description}
      </Text>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={() => job.url && Linking.openURL(job.url)}
      >
        <Text style={styles.applyText}>Apply Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  company: { fontSize: 16, color: '#4b5563', marginTop: 8 },
  salary: { fontSize: 15, color: '#6366f1', marginTop: 8, fontWeight: '500' },
  placeholder: { fontSize: 15, color: '#6b7280', marginTop: 16, lineHeight: 22 },
  applyButton: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
