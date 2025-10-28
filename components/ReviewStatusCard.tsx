import React from 'react';
import { StyleSheet, View as RNView, TouchableOpacity, Linking } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';

interface ReviewStatusCardProps {
  // User info
  displayName: string;
  avatarUri?: string;
  
  // Request info
  status: string;
  createdAt: string;
  
  // Consent info
  hasConsent?: boolean;
  shareConsent?: boolean;
  
  // Earnings info
  amountCents?: number;
  auroFeeCents?: number;
  stripeFeeCents?: number;
  netAmountCents?: number;
  auroFeeBps?: number;
  expressUrl?: string | null;
  
  // Status message
  statusMessage?: string;
}

export default function ReviewStatusCard({
  displayName,
  avatarUri,
  status,
  createdAt,
  hasConsent,
  shareConsent,
  amountCents,
  auroFeeCents,
  stripeFeeCents,
  netAmountCents,
  auroFeeBps,
  expressUrl,
  statusMessage
}: ReviewStatusCardProps) {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <View style={styles.card}>
      <View style={styles.gradient}>
        {/* Header Section */}
        <RNView style={styles.header}>
          <Avatar uri={avatarUri} name={displayName} size={80} />
          
          <RNView style={styles.statusBadge}>
            <StatusBadge status={status as any} />
          </RNView>
          
          <Text style={styles.displayName}>{displayName}</Text>
          
          {statusMessage && (
            <Text style={styles.statusMessage}>{statusMessage}</Text>
          )}
        </RNView>

        {/* Consent Section */}
        {hasConsent && (
          <RNView style={styles.consentSection}>
            <RNView style={[
              styles.consentPill,
              { 
                backgroundColor: shareConsent 
                  ? Colors.brand.status.completed + '20' 
                  : Colors.brand.status.rejected + '20',
                borderColor: shareConsent 
                  ? Colors.brand.status.completed 
                  : Colors.brand.status.rejected
              }
            ]}>
              <Text style={[
                styles.consentText,
                { 
                  color: shareConsent 
                    ? Colors.brand.status.completed 
                    : Colors.brand.status.rejected
                }
              ]}>
                {shareConsent ? '✅' : '❌'} Social consent: {shareConsent ? 'Yes' : 'No'}
              </Text>
            </RNView>
          </RNView>
        )}

        {/* Earnings Section */}
        {(amountCents || netAmountCents) && (
          <RNView style={styles.earningsSection}>
            <Text style={styles.earningsTitle}>Earnings Breakdown</Text>
            
            <RNView style={styles.earningsGrid}>
              {/* Price */}
              {typeof amountCents === 'number' && (
                <RNView style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Total Price</Text>
                  <Text style={styles.earningsValue}>{formatCurrency(amountCents)}</Text>
                </RNView>
              )}
              
              {/* Auro Fee - 20% */}
              {typeof amountCents === 'number' && (
                <RNView style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Auro fee (20%)</Text>
                  <Text style={[styles.earningsValue, styles.feeValue]}>
                    -{formatCurrency(Math.round(amountCents * 0.2))}
                  </Text>
                </RNView>
              )}
              
              {/* Stripe Fee - 2.9% + $0.30 */}
              {typeof amountCents === 'number' && (
                <RNView style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Stripe fee (2.9% + $0.30)</Text>
                  <Text style={[styles.earningsValue, styles.feeValue]}>
                    -{formatCurrency(Math.round(amountCents * 0.029 + 30))}
                  </Text>
                </RNView>
              )}
              
              {/* Net Amount - Correct calculation */}
              {typeof amountCents === 'number' && (
                <RNView style={[styles.earningsRow, styles.netAmountRow]}>
                  <Text style={styles.netAmountLabel}>You receive</Text>
                  <Text style={styles.netAmountValue}>
                    {formatCurrency(Math.round(amountCents - (amountCents * 0.2) - (amountCents * 0.029 + 30)))}
                  </Text>
                </RNView>
              )}
            </RNView>
            
            {/* Stripe Dashboard Button */}
            {expressUrl && (
              <TouchableOpacity 
                style={styles.dashboardButton} 
                onPress={() => {
                  try { 
                    Linking.openURL(expressUrl!); 
                  } catch {}
                }}
              >
                <Text style={styles.dashboardButtonText}>💳 Open Stripe Dashboard</Text>
              </TouchableOpacity>
            )}
          </RNView>
        )}

        {/* Request Date */}
        <RNView style={styles.dateSection}>
          <Text style={styles.dateText}>
            📅 Requested on {new Date(createdAt).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        </RNView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  gradient: {
    padding: 24,
    backgroundColor: Colors.brand.cardBackground,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    marginTop: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  displayName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    backgroundColor: Colors.brand.cardBackground + '80',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  consentSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  consentPill: {
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: Colors.brand.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  consentText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  earningsSection: {
    marginBottom: 20,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.brand.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  earningsGrid: {
    backgroundColor: Colors.brand.cardBackground + '60',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  earningsLabel: {
    fontSize: 15,
    color: Colors.brand.textSecondary,
    fontWeight: '500',
  },
  earningsValue: {
    fontSize: 15,
    color: Colors.brand.textPrimary,
    fontWeight: '600',
  },
  feeValue: {
    color: Colors.brand.status.rejected,
  },
  netAmountRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.brand.border + '40',
  },
  netAmountLabel: {
    fontSize: 16,
    color: Colors.brand.textPrimary,
    fontWeight: '700',
  },
  netAmountValue: {
    fontSize: 18,
    color: Colors.brand.status.completed,
    fontWeight: '800',
  },
  dashboardButton: {
    backgroundColor: Colors.brand.accentOrange,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: Colors.brand.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dashboardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.textOnGradient,
    letterSpacing: 0.3,
  },
  dateSection: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: Colors.brand.textSecondary,
    fontWeight: '500',
    backgroundColor: Colors.brand.cardBackground + '60',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
