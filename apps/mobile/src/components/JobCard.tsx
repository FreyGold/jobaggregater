import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import type { Job, SavedJob, SavedJobStatus } from '@/lib/types';

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SavedJobStatus, { label: string; bg: string; text: string }> = {
  WISHLIST: { label: 'Wishlist', bg: 'bg-zinc-800', text: 'text-zinc-300' },
  APPLIED: { label: 'Applied', bg: 'bg-blue-950', text: 'text-blue-400' },
  INTERVIEWING: { label: 'Interviewing', bg: 'bg-amber-950', text: 'text-amber-400' },
  OFFERED: { label: 'Offered', bg: 'bg-emerald-950', text: 'text-emerald-400' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-950', text: 'text-red-400' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs) || diffMs < 0) return 'just now';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

interface AlertJobCardProps {
  job: Job;
  isSaved: boolean;
  onSave: (jobId: string) => void;
  onUnsave: (jobId: string) => void;
}

export const AlertJobCard = React.memo(function AlertJobCard({
  job,
  isSaved,
  onSave,
  onUnsave,
}: AlertJobCardProps) {
  const salary = job.salary;
  return (
    <View className="bg-zinc-900 border border-zinc-800 p-4 mb-3 rounded-xl">
      <View className="flex-row items-center justify-between">
        <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{job.company}</Text>
        <Pressable
          onPress={() => (isSaved ? onUnsave(job.id) : onSave(job.id))}
          className="p-1"
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? '#6366f1' : '#71717a'}
          />
        </Pressable>
      </View>

      <Text className="text-white text-base font-bold mt-1">{job.title}</Text>

      <View className="flex-row items-center gap-3 mt-2 flex-wrap">
        <View className="flex-row items-center">
          <Ionicons name="map-outline" size={13} color="#71717a" />
          <Text className="text-zinc-500 text-xs ml-1" numberOfLines={1}>
            {job.isRemote ? 'Remote' : job.location}
          </Text>
        </View>
        {salary ? (
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={13} color="#71717a" />
            <Text className="text-zinc-500 text-xs ml-1">{salary}</Text>
          </View>
        ) : null}
      </View>

      {job.description ? (
        <Text className="text-zinc-400 text-xs mt-3 leading-relaxed" numberOfLines={3}>
          {job.description.replace(/<[^>]*>/g, '')}
        </Text>
      ) : null}

      <Pressable
        onPress={() => Linking.openURL(job.url)}
        className="flex-row items-center mt-3 pt-2.5 border-t border-zinc-800/60 w-full"
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="open-outline" size={14} color="#6366f1" />
        <Text className="text-indigo-400 text-xs font-medium ml-1">
          View posting
        </Text>
      </Pressable>
    </View>
  );
});

interface SavedJobCardProps {
  job: SavedJob;
  onStatusPress: (job: SavedJob) => void;
  onRemove: (jobId: string) => void;
}

export const SavedJobCard = React.memo(function SavedJobCard({
  job,
  onStatusPress,
  onRemove,
}: SavedJobCardProps) {
  const config = STATUS_CONFIG[job.savedStatus] || STATUS_CONFIG.WISHLIST;
  const salary = job.salary;

  return (
    <View className="bg-zinc-900 border border-zinc-800 p-4 mb-3 rounded-xl">
      <View className="flex-row items-center justify-between">
        <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{job.company}</Text>
        <Pressable
          onPress={() => onRemove(job.id)}
          className="p-1"
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </Pressable>
      </View>

      <Text className="text-white text-base font-bold mt-1">{job.title}</Text>

      <View className="flex-row items-center gap-3 mt-2 flex-wrap">
        <View className="flex-row items-center">
          <Ionicons name="map-outline" size={13} color="#71717a" />
          <Text className="text-zinc-500 text-xs ml-1" numberOfLines={1}>
            {job.isRemote ? 'Remote' : job.location}
          </Text>
        </View>
        {salary ? (
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={13} color="#71717a" />
            <Text className="text-zinc-500 text-xs ml-1">{salary}</Text>
          </View>
        ) : null}
        <Text className="text-zinc-600 text-xs">
          Saved {timeAgo(job.savedAt)}
        </Text>
      </View>

      {/* Bottom row: status badge + external link */}
      <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-zinc-800/60">
        <Pressable
          onPress={() => onStatusPress(job)}
          className={`flex-row items-center ${config.bg} rounded-lg px-3 py-1.5`}
          style={({ pressed }) => ({
            opacity: pressed ? 0.75 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Text className={`${config.text} text-xs font-semibold`}>
            {config.label}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#71717a" style={{ marginLeft: 4 }} />
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL(job.url)}
          className="flex-row items-center"
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="open-outline" size={14} color="#6366f1" />
          <Text className="text-indigo-400 text-xs font-medium ml-1">
            View posting
          </Text>
        </Pressable>
      </View>
    </View>
  );
});
