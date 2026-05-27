import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { YARD_SIZE_PRESETS, YardSizePreset, Yard } from '../../types'
import { HARDINESS_ZONES } from '../../constants'

type Step = 'name' | 'size' | 'zone'
const STEPS: Step[] = ['name', 'size', 'zone']

interface Props {
  onYardCreated: (yard: Yard) => void
}

export default function OnboardingScreen({ onYardCreated }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [size, setSize] = useState<YardSizePreset>('M')
  const [zone, setZone] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleFinish() {
    if (saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      if (zone) {
        await supabase.from('users').update({ hardiness_zone: zone }).eq('id', user.id)
      }

      const preset = YARD_SIZE_PRESETS[size]
      const { data: yard, error } = await supabase
        .from('yards')
        .insert({
          user_id: user.id,
          name: name.trim() || 'My Yard',
          grid_width: preset.width,
          grid_height: preset.height,
        })
        .select()
        .single()

      if (error) throw error
      onYardCreated(yard)
    } catch (e: any) {
      Alert.alert('Error', e.message)
      setSaving(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌱</Text>
        <View style={styles.progress}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
          ))}
        </View>
      </View>

      {step === 'name' && (
        <View style={styles.step}>
          <Text style={styles.title}>Welcome to Que Plante</Text>
          <Text style={styles.subtitle}>Let's set up your yard in a few quick steps.</Text>
          <Text style={styles.label}>What would you like to call your yard?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Backyard, Front Garden..."
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => setStep('size')}
          />
          <Pressable style={styles.primaryButton} onPress={() => setStep('size')}>
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      )}

      {step === 'size' && (
        <View style={styles.step}>
          <Text style={styles.title}>Yard Size</Text>
          <Text style={styles.subtitle}>Each grid cell = 5×5 feet.</Text>
          {(Object.entries(YARD_SIZE_PRESETS) as [YardSizePreset, { width: number; height: number; label: string }][]).map(([key, preset]) => (
            <Pressable
              key={key}
              style={[styles.sizeCard, size === key && styles.sizeCardActive]}
              onPress={() => setSize(key)}
            >
              <Text style={[styles.sizeCardKey, size === key && styles.sizeCardKeyActive]}>{key}</Text>
              <View>
                <Text style={[styles.sizeCardLabel, size === key && styles.sizeCardLabelActive]}>
                  {preset.label}
                </Text>
                <Text style={[styles.sizeCardDims, size === key && styles.sizeCardDimsActive]}>
                  {preset.width} × {preset.height} cells
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable style={styles.primaryButton} onPress={() => setStep('zone')}>
            <Text style={styles.primaryButtonText}>Next →</Text>
          </Pressable>
        </View>
      )}

      {step === 'zone' && (
        <View style={[styles.step, styles.stepFlex]}>
          <Text style={styles.title}>Hardiness Zone</Text>
          <Text style={styles.subtitle}>Helps suggest plants for your climate.</Text>
          <ScrollView style={styles.zoneList} showsVerticalScrollIndicator={false}>
            {HARDINESS_ZONES.map(z => (
              <Pressable
                key={z}
                style={[styles.zoneItem, zone === z && styles.zoneItemActive]}
                onPress={() => setZone(z)}
              >
                <Text style={[styles.zoneItemText, zone === z && styles.zoneItemTextActive]}>
                  Zone {z}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.zoneItem, zone === '' && styles.zoneItemActive]}
              onPress={() => setZone('')}
            >
              <Text style={[styles.zoneItemText, zone === '' && styles.zoneItemTextActive]}>
                Not sure
              </Text>
            </Pressable>
          </ScrollView>
          <Pressable
            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
            onPress={handleFinish}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>Get Started 🌿</Text>
            }
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#f8f5f0' },
  header:                 { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  logo:                   { fontSize: 48, marginBottom: 12 },
  progress:               { flexDirection: 'row', gap: 8 },
  dot:                    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive:              { backgroundColor: '#2d5a27' },
  step:                   { paddingHorizontal: 24, paddingTop: 16 },
  stepFlex:               { flex: 1 },
  title:                  { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  subtitle:               { fontSize: 15, color: '#666', marginBottom: 24 },
  label:                  { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, backgroundColor: '#fff', color: '#1a1a1a', marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#2d5a27', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  primaryButtonDisabled:  { opacity: 0.6 },
  primaryButtonText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  sizeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12,
    padding: 16, marginBottom: 10, backgroundColor: '#fff',
  },
  sizeCardActive:         { borderColor: '#2d5a27', backgroundColor: '#f0f8f0' },
  sizeCardKey:            { fontSize: 22, fontWeight: '800', color: '#999', width: 32 },
  sizeCardKeyActive:      { color: '#2d5a27' },
  sizeCardLabel:          { fontSize: 15, fontWeight: '600', color: '#333' },
  sizeCardLabelActive:    { color: '#1a1a1a' },
  sizeCardDims:           { fontSize: 13, color: '#aaa', marginTop: 2 },
  sizeCardDimsActive:     { color: '#4a7c40' },
  zoneList:               { flex: 1, marginBottom: 16 },
  zoneItem: {
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
    marginBottom: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee',
  },
  zoneItemActive:         { backgroundColor: '#2d5a27', borderColor: '#2d5a27' },
  zoneItemText:           { fontSize: 15, color: '#333' },
  zoneItemTextActive:     { color: '#fff', fontWeight: '600' },
})
