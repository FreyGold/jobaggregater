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
        <ActivityIndicator size="large" color="#6366f1" />
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
          <TouchableOpacity style={styles.manageButton} onPress={handleManage}>
            <Text style={styles.manageText}>Manage Billing</Text>
          </TouchableOpacity>
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
              <TouchableOpacity
                style={[styles.subscribeButton, isDowngrade && styles.subscribeButtonMuted]}
                onPress={() => handleSubscribe(plan.id)}
                disabled={checkoutLoading === plan.id}
              >
                {checkoutLoading === plan.id ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.subscribeText}>
                    {isDowngrade ? 'Switch to ' : 'Upgrade to '}{plan.name}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  currentBadge: {
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentBadgeText: { fontSize: 14, fontWeight: '600', color: '#4338ca' },
  manageButton: {
    backgroundColor: '#4338ca',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageText: { color: '#ffffff', fontWeight: '500', fontSize: 13 },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planCardActive: { borderColor: '#6366f1', borderWidth: 2 },
  planCardHighlight: { borderColor: '#6366f1', borderWidth: 2 },
  popularBadge: {
    backgroundColor: '#6366f1',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  popularText: { color: '#ffffff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  planName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '800', color: '#111827' },
  priceInterval: { fontSize: 15, color: '#6b7280', marginLeft: 4 },
  feature: { fontSize: 14, color: '#4b5563', marginBottom: 8, lineHeight: 20 },
  currentPlanButton: {
    marginTop: 16,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  currentPlanText: { color: '#6b7280', fontWeight: '600' },
  subscribeButton: {
    marginTop: 16,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  subscribeButtonMuted: { backgroundColor: '#9ca3af' },
  subscribeText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
});
