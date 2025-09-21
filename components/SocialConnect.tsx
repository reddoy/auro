import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Text, View } from './Themed';
import Colors from '@/constants/Colors';
import { fetchLinkedSocialAccounts, startSocialConnect, unlinkSocialAccount, type SocialAccount } from '@/lib/social';

type Props = {
  compact?: boolean;
};

export default function SocialConnect(props: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try { setAccounts(await fetchLinkedSocialAccounts()); } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const openConnect = async (provider: 'tiktok' | 'instagram') => {
    const returnTo = Platform.select({ web: window.location.origin + '/auth/callback', default: '' });
    const url = await startSocialConnect(provider, returnTo || undefined);
    if (url) {
      try { await Linking.openURL(url); } catch {}
    }
  };

  const handleUnlink = async (provider: 'tiktok' | 'instagram') => {
    const ok = await unlinkSocialAccount(provider);
    if (ok) refresh();
  };

  const hasTikTok = accounts.some(a => a.provider === 'tiktok');
  const hasInstagram = accounts.some(a => a.provider === 'instagram');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Social Accounts</Text>

      <View style={styles.row}>
        <Text style={styles.label}>TikTok</Text>
        {hasTikTok ? (
          <View style={styles.actions}>
            <Text style={styles.connectedText}>Connected</Text>
            <TouchableOpacity style={[styles.btn, styles.unlink]} onPress={() => handleUnlink('tiktok')}>
              <Text style={[styles.btnText, styles.unlinkText]}>Unlink</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.tiktok]} onPress={() => openConnect('tiktok')}>
            <Text style={styles.btnText}>Connect TikTok</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Instagram</Text>
        {hasInstagram ? (
          <View style={styles.actions}>
            <Text style={styles.connectedText}>Connected</Text>
            <TouchableOpacity style={[styles.btn, styles.unlink]} onPress={() => handleUnlink('instagram')}>
              <Text style={[styles.btnText, styles.unlinkText]}>Unlink</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.instagram]} onPress={() => openConnect('instagram')}>
            <Text style={styles.btnText}>Connect Instagram</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? <Text style={styles.hint}>Refreshing…</Text> : null}
      <Text style={styles.hint}>We won't use these for login. Linking only allows posting on your behalf.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.brand.cardBackground, borderRadius: 16, padding: 16, marginTop: 8 },
  title: { color: Colors.brand.textPrimary, fontWeight: '900', fontSize: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: Colors.brand.textPrimary, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: Colors.brand.textOnGradient, fontWeight: '700' },
  tiktok: { backgroundColor: '#000' },
  instagram: { backgroundColor: '#E1306C' },
  unlink: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.brand.border },
  unlinkText: { color: Colors.brand.textPrimary },
  connectedText: { color: Colors.brand.textSecondary, marginRight: 6 },
  hint: { marginTop: 6, color: Colors.brand.textSecondary, fontSize: 12 },
});


