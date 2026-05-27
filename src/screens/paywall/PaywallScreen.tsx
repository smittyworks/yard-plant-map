import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { FREE_TIER_PLANT_LIMIT } from '../../constants'

const FEATURES = [
  { icon: '🌱', text: 'Unlimited plants' },
  { icon: '📷', text: 'Unlimited photo identification' },
  { icon: '🗺', text: 'Multiple yards' },
  { icon: '⏰', text: 'Unlimited care reminders' },
]

interface Props {
  onClose: () => void
  onUnlocked: () => void
}

export default function PaywallScreen({ onClose, onUnlocked }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    try {
      // TODO: Replace with RevenueCat purchase flow before App Store submission
      // For now, directly grant premium (dev/testing only)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error } = await supabase
        .from('users')
        .update({ is_premium: true })
        .eq('id', user.id)

      if (error) throw error
      onUnlocked()
    } catch (e: any) {
      Alert.alert('Error', e.message)
      setLoading(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🌿</Text>
          <Text style={styles.heroTitle}>Upgrade to Premium</Text>
          <Text style={styles.heroSubtitle}>
            You've added {FREE_TIER_PLANT_LIMIT} plants — you're a serious gardener!
          </Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
              <Text style={styles.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingBadge}>MOST POPULAR</Text>
          </View>
          <Text style={styles.pricingTitle}>Annual Plan</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingAmount}>$19.99</Text>
            <Text style={styles.pricingPer}>/year</Text>
          </View>
          <Text style={styles.pricingNote}>Less than $2/month · Cancel anytime</Text>
        </View>

        <Pressable
          style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.subscribeBtnText}>Get Premium →</Text>
          }
        </Pressable>

        <Text style={styles.legal}>
          Payment processed securely through the App Store. Subscription renews annually.
          Cancel anytime in your Apple ID settings.
        </Text>
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f8f5f0' },
  content:              { padding: 24, paddingBottom: 48 },
  closeBtn:             { alignSelf: 'flex-end', padding: 4 },
  closeBtnText:         { fontSize: 18, color: '#999' },
  hero:                 { alignItems: 'center', paddingVertical: 24 },
  heroEmoji:            { fontSize: 64, marginBottom: 12 },
  heroTitle:            { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  heroSubtitle:         { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  featureList:          { backgroundColor: '#fff', borderRadius: 16, padding: 8, marginBottom: 20 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12, gap: 12,
  },
  featureIcon:          { fontSize: 22, width: 32, textAlign: 'center' },
  featureText:          { flex: 1, fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  featureCheck:         { fontSize: 16, color: '#2d5a27', fontWeight: '700' },
  pricingCard: {
    borderRadius: 16, borderWidth: 2, borderColor: '#2d5a27',
    overflow: 'hidden', marginBottom: 20,
  },
  pricingHeader:        { backgroundColor: '#2d5a27', paddingVertical: 6, alignItems: 'center' },
  pricingBadge:         { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pricingTitle:         { fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', paddingTop: 16 },
  pricingRow:           { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingTop: 4 },
  pricingAmount:        { fontSize: 42, fontWeight: '800', color: '#2d5a27' },
  pricingPer:           { fontSize: 16, color: '#888', paddingBottom: 8, marginLeft: 4 },
  pricingNote:          { fontSize: 13, color: '#888', textAlign: 'center', paddingBottom: 16 },
  subscribeBtn: {
    backgroundColor: '#2d5a27', borderRadius: 14,
    paddingVertical: 17, alignItems: 'center', marginBottom: 16,
  },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800' },
  legal:                { fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 16 },
})
