import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View as RNView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { getRequestsByReviewer } from '@/lib/api';
import type { DbRequestSummary } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import Spinner from '@/components/Spinner';

export default function ReviewerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<DbRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    try {
      // This would need to be updated to get the current user's reviewer ID
      // For now, we'll show a placeholder
      setRequests([]);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Spinner size={40} color={Colors.brand.accentMagenta} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ 
          paddingTop: 12, 
          paddingBottom: Platform.OS === 'web' ? 24 : insets.bottom + 24, 
          paddingHorizontal: 16 
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Reviewer Dashboard</Text>
        <Text style={styles.subtitle}>Manage your review requests</Text>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>
              When you receive review requests, they'll appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => router.push(`/(tabs)/requests/reviewer/${request.id}`)}
              >
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>Review Request</Text>
                  <StatusBadge status={request.status as any} />
                </View>
                <Text style={styles.requestDate}>
                  {new Date(request.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.brand.background 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: Colors.brand.textPrimary, 
    marginBottom: 4 
  },
  subtitle: { 
    fontSize: 16, 
    color: Colors.brand.textSecondary, 
    marginBottom: 24 
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 48 
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.brand.textPrimary, 
    marginBottom: 8 
  },
  emptyText: { 
    fontSize: 14, 
    color: Colors.brand.textSecondary, 
    textAlign: 'center', 
    lineHeight: 20 
  },
  requestsList: { 
    gap: 12 
  },
  requestCard: { 
    backgroundColor: Colors.brand.cardBackground, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: Colors.brand.border 
  },
  requestHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  requestTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.brand.textPrimary 
  },
  requestDate: { 
    fontSize: 14, 
    color: Colors.brand.textSecondary 
  },
});
