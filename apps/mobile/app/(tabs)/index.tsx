import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import type { Job } from '@jobagg/shared';
import { api } from '../../lib/api';
import { JobCard } from '../../components/ui/JobCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { JobFiltersSheet } from '../../components/ui/JobFiltersSheet';
import { Search as SearchIcon, SearchX, Briefcase, SlidersHorizontal } from 'lucide-react-native';
import { THEME } from '../../lib/theme';

export default function JobsFeedScreen() {
  const [keyword, setKeyword] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sources, setSources] = useState<{key: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searched, setSearched] = useState(false);

  // Filters State
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isRemote, setIsRemote] = useState<boolean | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      const res = await api.get<{key: string, name: string}[]>('/api/sources');
      setSources(res.data || []);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (keyword.trim()) params.append('keyword', keyword.trim());
      if (isRemote !== null) params.append('isRemote', String(isRemote));
      if (experience) params.append('experienceLevel', experience);
      if (employmentType) params.append('employmentType', employmentType);
      if (source) params.append('source', source);

      const res = await api.get<Job[]>(`/api/jobs?${params.toString()}`);
      setJobs(res.data || []);
      if (keyword.trim() || isRemote !== null || experience || employmentType || source) {
        setSearched(true);
      } else {
        setSearched(false);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [isRemote, experience, employmentType, source]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const activeFiltersCount = [isRemote !== null, experience !== null, employmentType !== null, source !== null].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.searchContainer}>
          <SearchIcon color={THEME.colors.textMuted} size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor={THEME.colors.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={fetchJobs}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={() => setIsFilterVisible(true)}
        >
          <SlidersHorizontal size={20} color={activeFiltersCount > 0 ? THEME.colors.primaryDark : THEME.colors.textSecondary} />
          {activeFiltersCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : jobs.length > 0 ? (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />
          }
          renderItem={({ item }) => <JobCard job={item} />}
        />
      ) : searched ? (
        <EmptyState 
          icon={<SearchX color={THEME.colors.textSecondary} size={32} />}
          title="No results found"
          description="We couldn't find any matching jobs. Try adjusting your search term or filters."
        />
      ) : (
        <EmptyState 
          icon={<Briefcase color={THEME.colors.textSecondary} size={32} />}
          title="No jobs available"
          description="Check back later for new opportunities."
        />
      )}

      <JobFiltersSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        selectedRemote={isRemote}
        setSelectedRemote={setIsRemote}
        selectedExperience={experience}
        setSelectedExperience={setExperience}
        selectedType={employmentType}
        setSelectedType={setEmploymentType}
        selectedSource={source}
        setSelectedSource={setSource}
        sources={sources}
        onApply={() => setIsFilterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.layout.padding,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.layout.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: THEME.typography.body.fontSize,
    color: THEME.colors.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.layout.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: THEME.colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.background,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  list: { padding: THEME.layout.padding, gap: 12 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
