// ─── Subscription / Plans Screen ─────────────────────────────────

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import type { SubscriptionPlanDetails } from '@jobagg/shared';
import { THEME } from '../../lib/theme';
import { Button } from '../../components/ui/Button';

export default function SubscriptionScreen() {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlanDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await api.get<SubscriptionPlanDetails[]>('/api/subscriptions/plans');
        setPlans(res.data || []);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe to a plan.');
      return;
    }

    try {
      setCheckoutLoading(planId);
      const res = await api.post<{ url: string }>('/api/subscriptions/checkout', { plan: planId });
      const url = res.data?.url;
      if (url) {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      const res = await api.post<{ url: string }>('/api/subscriptions/portal');
      const url = res.data?.url;
      if (url) {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const currentPlan = user?.subscriptionPlan || 'FREE';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Subscription Plans</Text>
      {currentPlan !== 'FREE' && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>
            Current: {currentPlan} · {user?.subscriptionStatus}
          </Text>
          <Button title="Manage Billing" size="sm" variant="secondary" onPress={handleManage} />
        </View>
      )}

      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlan;
        const isDowngrade = currentPlan === 'ENTERPRISE' && plan.id === 'PRO';

        return (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              isCurrent && styles.planCardActive,
              plan.id === 'PRO' && styles.planCardHighlight,
            ]}
          >
            {plan.id === 'PRO' && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {plan.price === 0 ? 'Free' : `$${plan.price}`}
              </Text>
              {plan.price > 0 && <Text style={styles.priceInterval}>/month</Text>}
            </View>

            {plan.features.map((feature, i) => (
              <Text style={styles.feature} key={i}>
                ✓  {feature}
              </Text>
            ))}

            {isCurrent ? (
              <View style={styles.currentPlanButton}>
                <Text style={styles.currentPlanText}>Current Plan</Text>
              </View>
            ) : plan.id === 'FREE' ? null : (
              <Button
                title={`${isDowngrade ? 'Switch to ' : 'Upgrade to '}${plan.name}`}
                style={{ marginTop: 16 }}
                loading={checkoutLoading === plan.id}
                disabled={checkoutLoading === plan.id}
                onPress={() => handleSubscribe(plan.id)}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: THEME.layout.padding, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heading: { ...THEME.typography.h2, marginBottom: 16 },
  currentBadge: {
    backgroundColor: THEME.colors.primaryLight,
    padding: 16,
    borderRadius: THEME.layout.borderRadius.md,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentBadgeText: { fontSize: 14, fontWeight: '600', color: THEME.colors.primaryDark },
  planCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.layout.borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.sm,
  },
  planCardActive: { borderColor: THEME.colors.primary, borderWidth: 2 },
  planCardHighlight: { borderColor: THEME.colors.primary, borderWidth: 2 },
  popularBadge: {
    backgroundColor: THEME.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  popularText: { color: '#ffffff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  planName: { ...THEME.typography.h3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '800', color: THEME.colors.text },
  priceInterval: { fontSize: 15, color: THEME.colors.textSecondary, marginLeft: 4 },
  feature: { ...THEME.typography.body, marginBottom: 8 },
  currentPlanButton: {
    marginTop: 16,
    backgroundColor: THEME.colors.divider,
    paddingVertical: 14,
    borderRadius: THEME.layout.borderRadius.md,
    alignItems: 'center',
  },
  currentPlanText: { color: THEME.colors.textSecondary, fontWeight: '600' },
});
