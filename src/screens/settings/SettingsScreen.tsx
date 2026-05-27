import React, { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { HARDINESS_ZONES } from '../../constants'
import { YARD_SIZE_PRESETS, YardSizePreset } from '../../types'

export default function SettingsScreen() {
  const [email, setEmail] = useState('')
  const [yardName, setYardName] = useState('')
  const [yardSize, setYardSize] = useState<YardSizePreset>('M')
  const [hardinessZone, setHardinessZone] = useState('')
  const [yardId, setYardId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showZonePicker, setShowZonePicker] = useState(false)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')
    setUserId(user.id)

    const { data: userData } = await supabase
      .from('users').select('hardiness_zone').eq('id', user.id).single()
    setHardinessZone(userData?.hardiness_zone ?? '')

    const { data: yard } = await supabase
      .from('yards').select('*').eq('user_id', user.id).maybeSingle()
    if (yard) {
      setYardId(yard.id)
      setYardName(yard.name)
      // Match size to preset
      const match = (Object.entries(YARD_SIZE_PRESETS) as [YardSizePreset, { width: number; height: number }][])
        .find(([, p]) => p.width === yard.grid_width && p.height === yard.grid_height)
      if (match) setYardSize(match[0])
    }
  }

  async function handleSave() {
    if (!userId || !yardId) return
    setSaving(true)
    try {
      const preset = YARD_SIZE_PRESETS[yardSize]
      await Promise.all([
        supabase.from('users').update({ hardiness_zone: hardinessZone || null }).eq('id', userId),
        supabase.from('yards').update({
          name: yardName.trim() || 'My Yard',
          grid_width: preset.width,
          grid_height: preset.height,
        }).eq('id', yardId),
      ])
      Alert.alert('Saved', 'Settings updated.')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Email</Text>
        <Text style={styles.infoValue}>{email}</Text>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Yard</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={yardName}
        onChangeText={setYardName}
        placeholder="My Yard"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.label}>Size</Text>
      <View style={styles.sizeRow}>
        {(Object.entries(YARD_SIZE_PRESETS) as [YardSizePreset, { width: number; height: number; label: string }][]).map(([key, preset]) => (
          <Pressable
            key={key}
            style={[styles.sizeChip, yardSize === key && styles.sizeChipActive]}
            onPress={() => setYardSize(key)}
          >
            <Text style={[styles.sizeChipKey, yardSize === key && styles.sizeChipKeyActive]}>{key}</Text>
            <Text style={[styles.sizeChipLabel, yardSize === key && styles.sizeChipLabelActive]}>
              {preset.label.split('(')[0].trim()}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Climate</Text>
      <Text style={styles.label}>Hardiness Zone</Text>
      <Pressable style={styles.input} onPress={() => setShowZonePicker(v => !v)}>
        <Text style={{ color: hardinessZone ? '#1a1a1a' : '#aaa', fontSize: 15 }}>
          {hardinessZone ? `Zone ${hardinessZone}` : 'Select zone...'}
        </Text>
      </Pressable>
      {showZonePicker ? (
        <View style={styles.zonePicker}>
          {[...HARDINESS_ZONES, ''].map(z => (
            <Pressable
              key={z || 'none'}
              style={[styles.zoneOption, hardinessZone === z && styles.zoneOptionActive]}
              onPress={() => { setHardinessZone(z); setShowZonePicker(false) }}
            >
              <Text style={[styles.zoneOptionText, hardinessZone === z && styles.zoneOptionTextActive]}>
                {z ? `Zone ${z}` : 'Not sure'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </Pressable>

      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8f5f0' },
  content:             { padding: 20, paddingBottom: 48 },
  sectionTitle:        { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  infoRow:             { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 4 },
  infoLabel:           { fontSize: 15, color: '#555' },
  infoValue:           { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  label:               { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, backgroundColor: '#fff', color: '#1a1a1a', marginBottom: 16,
    justifyContent: 'center',
  },
  sizeRow:             { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sizeChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
  },
  sizeChipActive:      { borderColor: '#2d5a27', backgroundColor: '#f0f8f0' },
  sizeChipKey:         { fontSize: 16, fontWeight: '800', color: '#999' },
  sizeChipKeyActive:   { color: '#2d5a27' },
  sizeChipLabel:       { fontSize: 11, color: '#aaa', marginTop: 2 },
  sizeChipLabelActive: { color: '#4a7c40' },
  zonePicker: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#e0e0e0', marginBottom: 16, maxHeight: 200, overflow: 'scroll',
  },
  zoneOption:          { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  zoneOptionActive:    { backgroundColor: '#2d5a27' },
  zoneOptionText:      { fontSize: 14, color: '#333' },
  zoneOptionTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#2d5a27', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 24, marginBottom: 16,
  },
  saveBtnDisabled:     { opacity: 0.6 },
  saveBtnText:         { color: '#fff', fontSize: 16, fontWeight: '700' },
  signOutBtn: {
    borderWidth: 1.5, borderColor: '#c00', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  signOutText:         { color: '#c00', fontSize: 15, fontWeight: '600' },
})
