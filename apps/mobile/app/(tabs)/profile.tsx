// ─── Profile Tab ─────────────────────────────────────────────────

import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { ChevronRight } from 'lucide-react-native';
import { THEME } from '../../lib/theme';
import { Button } from '../../components/ui/Button';

const PLAN_COLORS: Record<string, string> = {
  FREE: THEME.colors.textMuted,
  PRO: THEME.colors.primary,
  ENTERPRISE: THEME.colors.warning,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome to JobAgg</Text>
          <Text style={styles.subtext}>
            Sign in to save jobs and track your applications.
          </Text>
          <Button 
            title="Sign In" 
            style={{ width: '100%', marginTop: 24 }} 
            onPress={() => router.push('/(auth)/login')} 
          />
          <Button 
            title="Create Account" 
            variant="outline" 
            style={{ width: '100%', marginTop: 12 }} 
            onPress={() => router.push('/(auth)/register')} 
          />
        </View>
      </View>
    );
  }

  const planColor = PLAN_COLORS[user.subscriptionPlan] || PLAN_COLORS.FREE;

  return (
    <View style={styles.container}>
      {/* User Info */}
      <View style={styles.card}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>

        <View style={[styles.planBadge, { backgroundColor: planColor + '20' }]}>
          <Text style={[styles.planBadgeText, { color: planColor }]}>
            {user.subscriptionPlan} Plan
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/subscription')}
        >
          <Text style={styles.menuText}>Manage Subscription</Text>
          <ChevronRight size={20} color={THEME.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomWidth: 0 }]}
          onPress={() => router.push('/(tabs)/saved')}
        >
          <Text style={styles.menuText}>Saved Jobs</Text>
          <ChevronRight size={20} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <Button 
        title="Sign Out" 
        variant="ghost" 
        textStyle={{ color: THEME.colors.error }}
        style={styles.logoutButton}
        onPress={handleLogout} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, padding: THEME.layout.padding },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.layout.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
    ...THEME.shadows.sm,
  },
  menuCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
    ...THEME.shadows.sm,
  },
  heading: { ...THEME.typography.h2 },
  subtext: { ...THEME.typography.body, marginTop: 8, textAlign: 'center' },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: THEME.colors.primary },
  userName: { ...THEME.typography.h3 },
  userEmail: { ...THEME.typography.body, marginTop: 4 },
  planBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: THEME.layout.borderRadius.pill,
  },
  planBadgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: THEME.layout.padding,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  menuText: { ...THEME.typography.subtitle },
  logoutButton: {
    marginTop: 8,
    backgroundColor: THEME.colors.errorLight,
  },
});
