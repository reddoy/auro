import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';

export type RequestStatus = 'pending' | 'accepted' | 'paid' | 'in_progress' | 'completed' | 'rejected';

type Props = {
  status: RequestStatus;
  label?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
};

const defaultLabelForStatus = (status: RequestStatus) => {
  switch (status) {
    case 'completed':
      return 'Review Submitted';
    case 'in_progress':
      return 'In Progress';
    case 'accepted':
      return 'Awaiting payment';
    case 'paid':
      return 'Pending acceptance';
    case 'pending':
      return 'Pending acceptance';
    case 'rejected':
      return 'Declined';
    default:
      return status;
  }
};

export default function StatusBadge({ status, label, style, textStyle, accessibilityLabel }: Props) {
  const bgColor = (Colors.brand.status as any)?.[status] || '#999999';
  const finalLabel = label || defaultLabelForStatus(status);

  return (
    <View
      style={[styles.badge, { backgroundColor: bgColor }, style]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || `${finalLabel} status`}
    >
      <Text style={[styles.text, textStyle]}>{finalLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    // Keep body font family consistent
    fontFamily: 'Inter_600SemiBold',
  },
});


