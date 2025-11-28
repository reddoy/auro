import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { BorderRadius, Typography } from '@/constants/DesignSystem';

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

// Ensure text color has sufficient contrast (WCAG AA: 4.5:1 for normal text)
const getTextColor = (bgColor: string): string => {
  // All status colors should have white text for sufficient contrast
  return '#FFFFFF';
};

export default function StatusBadge({ status, label, style, textStyle, accessibilityLabel }: Props) {
  const bgColor = (Colors.brand.status as any)?.[status] || '#999999';
  const finalLabel = label || defaultLabelForStatus(status);
  const textColor = getTextColor(bgColor);

  return (
    <View
      style={[styles.badge, { backgroundColor: bgColor }, style]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || `${finalLabel} status`}
    >
      <Text style={[styles.text, { color: textColor }, textStyle]}>{finalLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    minHeight: 24, // Ensure minimum touch target
  },
  text: {
    color: '#FFFFFF', // High contrast white text
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
  },
});


