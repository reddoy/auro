import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import Colors from '@/constants/Colors';
import type { RequestData } from '../index';
import Avatar from '@/components/Avatar';

type Props = {
  requestData: RequestData;
  onSelect: (creatorId: string, creatorSlug: string) => void;
  onBack: () => void;
  supabase: any;
};

type Creator = {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  hourly_rate?: number;
  rating_average?: number;
};

export default function CreatorSelectionStep({ requestData, onSelect, onBack, supabase }: Props) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, hourly_rate, rating_average')
          .eq('is_reviewer', 'approved')
          .not('hourly_rate', 'is', null)
          .gt('hourly_rate', 0)
          .order('rating_average', { ascending: false, nullsFirst: false });

        if (error) throw error;

        const normalized: Creator[] = (data || []).map((c: any) => ({
          id: c.id,
          username: c.username,
          avatar_url: c.avatar_url,
          full_name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username,
          hourly_rate: c.hourly_rate,
          rating_average: c.rating_average,
        }));

        setCreators(normalized);
      } catch (error) {
        console.error('Error fetching creators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.brand.accentOrange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Reviewer</Text>
      <FlatList
        data={creators}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.creatorCard}
            onPress={() => onSelect(item.id, item.username)}
          >
            <Avatar
              uri={item.avatar_url}
              name={item.full_name}
              size={60}
            />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{item.full_name}</Text>
              {item.hourly_rate && (
                <Text style={styles.creatorPrice}>${item.hourly_rate}/review</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.brand.textPrimary,
    marginBottom: 20,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  creatorInfo: {
    marginLeft: 16,
    flex: 1,
  },
  creatorName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.brand.textPrimary,
    marginBottom: 4,
  },
  creatorPrice: {
    fontSize: 16,
    color: Colors.brand.accentOrange,
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.brand.textSecondary,
  },
});
