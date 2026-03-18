import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Linking, Share, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Bookmark, MapPin, Building2, ArrowUpRight, Share as ShareIcon, ChevronDown, ChevronUp } from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';

import type { Job } from '@jobagg/shared';
import { THEME } from '../../lib/theme';
import { Chip } from './Chip';
import { Button } from './Button';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface JobCardProps {
  job: Job;
  isSaved?: boolean;
  onSaveToggle?: (jobId: string, currentlySaved: boolean) => void;
}

export function JobCard({ job, isSaved = false, onSaveToggle }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { width } = useWindowDimensions();

  const toggleExpand = () => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut }
    });
    setExpanded(!expanded);
  };

  const handleShare = async () => {
    if (!job || !job.url) return;
    try {
      await Share.share({
        message: `Check out this job: ${job.title} at ${job.company}\n\n${job.url}`,
        title: job.title,
        url: job.url,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const formatSalary = () => {
    const curr = job.salaryCurrency || '$';
    if (job.salaryMin && job.salaryMax) {
      if (job.salaryMax > 1000) {
         return `${curr}${Math.round(job.salaryMin/1000)}k - ${curr}${Math.round(job.salaryMax/1000)}k`;
      }
      return `${curr}${job.salaryMin} - ${curr}${job.salaryMax}`;
    }
    if (job.salaryMax) return `Up to ${curr}${job.salaryMax}`;
    if (job.salaryMin) return `From ${curr}${job.salaryMin}`;
    return null;
  };

  const salaryDisplay = formatSalary();

  return (
    <Pressable
      style={[styles.card, THEME.shadows.sm]}
      onPress={toggleExpand}
    >
      <View style={styles.header}>
        <View style={styles.companyLogo}>
          <Text style={styles.companyInitial}>{job.company.charAt(0)}</Text>
        </View>
        <View style={styles.headerRight}>
          {expanded ? (
            <ChevronUp size={24} color={THEME.colors.textMuted} />
          ) : (
            <ChevronDown size={24} color={THEME.colors.textMuted} />
          )}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>{job.title}</Text>
      
      <View style={styles.detailsRow}>
        <Building2 size={16} color={THEME.colors.textMuted} />
        <Text style={styles.detailText}>{job.company}</Text>
      </View>

      <View style={[styles.detailsRow, { marginTop: 6 }]}>
        <MapPin size={16} color={THEME.colors.textMuted} />
        <Text style={styles.detailText}>{job.location}</Text>
      </View>

      <View style={styles.chipsRow}>
        {job.isRemote && (
          <Chip label="Remote" variant="primary" />
        )}
        {job.employmentType && (
          <Chip label={job.employmentType.replace('-', ' ')} />
        )}
        {job.experienceLevel && (
          <Chip label={job.experienceLevel.charAt(0).toUpperCase() + job.experienceLevel.slice(1)} />
        )}
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>About the role</Text>
          <RenderHTML
            contentWidth={width - (THEME.layout.padding * 2) - 2}
            source={{ html: job.description || '<p>No description provided.</p>' }}
            tagsStyles={{
              p: { ...THEME.typography.body, marginBottom: 12 },
              ul: { ...THEME.typography.body, marginBottom: 12, paddingLeft: 16 },
              li: { marginBottom: 8 },
              strong: { fontWeight: '700', color: THEME.colors.text },
              h1: { ...THEME.typography.h3, marginTop: 16, marginBottom: 8 },
              h2: { ...THEME.typography.h3, marginTop: 16, marginBottom: 8 },
              h3: { ...THEME.typography.subtitle, marginTop: 12, marginBottom: 8 },
              a: { color: THEME.colors.primary, textDecorationLine: 'none' }
            }}
          />

          <View style={styles.actionGrid}>
            <Button
              variant="outline"
              onPress={(e: any) => {
                e.stopPropagation();
                if (onSaveToggle) onSaveToggle(job.id, isSaved);
              }}
              icon={
                <Bookmark 
                  size={20} 
                  color={isSaved ? THEME.colors.primary : THEME.colors.text} 
                  fill={isSaved ? THEME.colors.primary : 'transparent'} 
                />
              }
              title=""
              style={styles.iconBtn}
            />
            <Button
              variant="outline"
              onPress={(e: any) => {
                e.stopPropagation();
                handleShare();
              }}
              icon={<ShareIcon size={20} color={THEME.colors.text} />}
              title=""
              style={styles.iconBtn}
            />
            <Button
              title="Apply Now"
              onPress={(e: any) => {
                e.stopPropagation();
                if (job.url) Linking.openURL(job.url);
              }}
              icon={<ArrowUpRight size={18} color="#fff" />}
              style={styles.applyBtn}
            />
          </View>
        </View>
      )}

      {!expanded && (
        <View style={styles.footer}>
          <Text style={styles.dateText}>
            {new Date(job.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
          </Text>
          {salaryDisplay && (
            <Text style={styles.salary}>{salaryDisplay}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.layout.borderRadius.lg,
    padding: THEME.layout.padding,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    width: 44,
  },
  title: {
    ...THEME.typography.h3,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    ...THEME.typography.body,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.divider,
  },
  salary: {
    ...THEME.typography.body,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  dateText: {
    ...THEME.typography.caption,
  },
  expandedContent: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginBottom: 20,
  },
  sectionTitle: {
    ...THEME.typography.subtitle,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.divider,
  },
  iconBtn: {
    width: 48,
    height: 48,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  applyBtn: {
    flex: 1,
  }
});
