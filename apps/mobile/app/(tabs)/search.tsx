// ─── Search Tab ──────────────────────────────────────────────────

import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import type { Job } from '@jobagg/shared';
import { api } from '../../lib/api';

export default function SearchScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = async () => {
    if (!keyword.trim()) {
      setJobs([]);
      setSearched(false);
      return;
    }
    
    try {
      setLoading(true);
      setSearched(true);
      // The API accepts ?keyword= for searching in the list route or specific search route
      const res = await api.get<{ data: Job[] }>(`/api/jobs?keyword=${encodeURIComponent(keyword)}&limit=50`);
      setJobs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to search jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword) performSearch();
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search jobs by title, company..."
        placeholderTextColor="#9ca3af"
        value={keyword}
        onChangeText={setKeyword}
        onSubmitEditing={performSearch}
        returnKeyType="search"
      />
      
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : jobs.length > 0 ? (
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
              {item.salaryMax ? ( 
                <Text style={styles.salary}>{item.salaryCurrency || '$'}{item.salaryMax}</Text>
              ) : item.salaryMin ? (
                <Text style={styles.salary}>{item.salaryCurrency || '$'}{item.salaryMin}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      ) : searched ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No jobs found for "{keyword}"</Text>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Search for jobs to get started
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  searchInput: {
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  list: { gap: 12, paddingBottom: 16 },
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#9ca3af' },
});
