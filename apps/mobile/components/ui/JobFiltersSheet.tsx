import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { THEME } from '../../lib/theme';
import { Button } from './Button';
import { EXPERIENCE_LEVELS, EMPLOYMENT_TYPES } from '@jobagg/shared';

interface JobFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedRemote: boolean | null;
  setSelectedRemote: (val: boolean | null) => void;
  selectedExperience: string | null;
  setSelectedExperience: (val: string | null) => void;
  selectedType: string | null;
  setSelectedType: (val: string | null) => void;
  onApply: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function JobFiltersSheet({
  visible,
  onClose,
  selectedRemote,
  setSelectedRemote,
  selectedExperience,
  setSelectedExperience,
  selectedType,
  setSelectedType,
  onApply
}: JobFiltersSheetProps) {
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const clearAll = () => {
    setSelectedRemote(null);
    setSelectedExperience(null);
    setSelectedType(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <Animated.View 
          style={[
            styles.sheet, 
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            
            {/* Remote Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work Model</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity 
                  style={[styles.chip, selectedRemote === null && styles.chipActive]}
                  onPress={() => setSelectedRemote(null)}
                >
                  <Text style={[styles.chipText, selectedRemote === null && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.chip, selectedRemote === true && styles.chipActive]}
                  onPress={() => setSelectedRemote(true)}
                >
                  <Text style={[styles.chipText, selectedRemote === true && styles.chipTextActive]}>Remote</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.chip, selectedRemote === false && styles.chipActive]}
                  onPress={() => setSelectedRemote(false)}
                >
                  <Text style={[styles.chipText, selectedRemote === false && styles.chipTextActive]}>On-site</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Experience Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience Level</Text>
              <View style={styles.chipRow}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <TouchableOpacity 
                    key={level}
                    style={[styles.chip, selectedExperience === level && styles.chipActive]}
                    onPress={() => setSelectedExperience(selectedExperience === level ? null : level)}
                  >
                    <Text style={[styles.chipText, selectedExperience === level && styles.chipTextActive]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Employment Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Employment Type</Text>
              <View style={styles.chipRow}>
                {EMPLOYMENT_TYPES.map((type) => (
                  <TouchableOpacity 
                    key={type}
                    style={[styles.chip, selectedType === type && styles.chipActive]}
                    onPress={() => setSelectedType(selectedType === type ? null : type)}
                  >
                    <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>
                      {type.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={[styles.footer, THEME.shadows.md]}>
            <Button 
              variant="outline" 
              title="Clear" 
              onPress={clearAll} 
              style={{ flex: 1, borderColor: THEME.colors.border }} 
              textStyle={{ color: THEME.colors.text }}
            />
            <Button 
              title="Apply Filters" 
              onPress={() => {
                onApply();
                onClose();
              }} 
              style={{ flex: 2, backgroundColor: THEME.colors.primaryDark }} 
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: THEME.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.layout.padding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  title: {
    ...THEME.typography.h3,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: THEME.layout.padding,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...THEME.typography.subtitle,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.layout.borderRadius.pill,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipActive: {
    backgroundColor: THEME.colors.primaryDark,
    borderColor: THEME.colors.primary,
  },
  chipText: {
    ...THEME.typography.bodySm,
    fontWeight: '500',
    color: THEME.colors.textSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginBottom: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.card,
    flexDirection: 'row',
    padding: THEME.layout.padding,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.divider,
    gap: 12,
  }
});
