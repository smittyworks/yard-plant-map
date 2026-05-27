import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from '../../lib/supabase'
import { CareEventType, Plant } from '../../types'

const CARE_TYPES: CareEventType[] = ['watering', 'fertilizing', 'pruning', 'treatment', 'transplanting', 'other']

const CARE_ICONS: Record<CareEventType, string> = {
  watering:      '💧',
  fertilizing:   '🌿',
  pruning:       '✂️',
  treatment:     '💊',
  transplanting: '🪴',
  other:         '📝',
}

// Days from today for quick picks
const DUE_OPTIONS = [
  { label: 'Today',      days: 0 },
  { label: 'Tomorrow',   days: 1 },
  { label: 'In 3 days',  days: 3 },
  { label: 'In 1 week',  days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 },
]

interface Props {
  onClose: () => void
  onAdded: () => void
  preselectedPlantId?: string
}

export default function AddReminderModal({ onClose, onAdded, preselectedPlantId }: Props) {
  const [plants, setPlants] = useState<Plant[]>([])
  const [selectedPlantId, setSelectedPlantId] = useState<string>(preselectedPlantId ?? '')
  const [careType, setCareType] = useState<CareEventType>('watering')
  const [dueDays, setDueDays] = useState<number>(7)
  const [saving, setSaving] = useState(false)
  const [loadingPlants, setLoadingPlants] = useState(true)

  useEffect(() => { loadPlants() }, [])

  async function loadPlants() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: yards } = await supabase.from('yards').select('id').eq('user_id', user.id).limit(1)
    if (!yards?.length) return
    const { data } = await supabase
      .from('plants').select('id, common_name, yard_id')
      .eq('yard_id', yards[0].id)
      .order('common_name')
    setPlants((data as Plant[]) ?? [])
    if (!preselectedPlantId && data?.length) setSelectedPlantId(data[0].id)
    setLoadingPlants(false)
  }

  async function handleSave() {
    if (!selectedPlantId) { Alert.alert('Select a plant'); return }
    setSaving(true)
    try {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + dueDays)
      const dueDateStr = dueDate.toISOString().split('T')[0]

      const { error } = await supabase.from('reminders').insert({
        plant_id: selectedPlantId,
        reminder_type: careType,
        due_date: dueDateStr,
      })
      if (error) throw error

      // Schedule a local push notification
      await scheduleNotification(
        plants.find(p => p.id === selectedPlantId)?.common_name ?? 'Your plant',
        careType,
        dueDate,
      )

      onAdded()
    } catch (e: any) {
      Alert.alert('Error', e.message)
      setSaving(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Add Reminder</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>

        {loadingPlants ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#2d5a27" />
        ) : (
          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Plant</Text>
            {plants.map(p => (
              <Pressable
                key={p.id}
                style={[styles.optionRow, selectedPlantId === p.id && styles.optionRowActive]}
                onPress={() => setSelectedPlantId(p.id)}
              >
                <Text style={[styles.optionText, selectedPlantId === p.id && styles.optionTextActive]}>
                  {p.common_name}
                </Text>
                {selectedPlantId === p.id ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
            ))}

            <Text style={[styles.label, { marginTop: 20 }]}>Care Type</Text>
            <View style={styles.careGrid}>
              {CARE_TYPES.map(t => (
                <Pressable
                  key={t}
                  style={[styles.careChip, careType === t && styles.careChipActive]}
                  onPress={() => setCareType(t)}
                >
                  <Text style={styles.careChipIcon}>{CARE_ICONS[t]}</Text>
                  <Text style={[styles.careChipText, careType === t && styles.careChipTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>Due</Text>
            <View style={styles.dueGrid}>
              {DUE_OPTIONS.map(opt => (
                <Pressable
                  key={opt.days}
                  style={[styles.dueChip, dueDays === opt.days && styles.dueChipActive]}
                  onPress={() => setDueDays(opt.days)}
                >
                  <Text style={[styles.dueChipText, dueDays === opt.days && styles.dueChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Reminder</Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

async function scheduleNotification(plantName: string, careType: CareEventType, dueDate: Date) {
  try {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return

    // Schedule for 9am on the due date
    const trigger = new Date(dueDate)
    trigger.setHours(9, 0, 0, 0)

    // Only schedule if the trigger is in the future
    if (trigger <= new Date()) return

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time to care for ${plantName}`,
        body: `${plantName} needs ${careType} today.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    })
  } catch {
    // Notifications are best-effort; don't block the save
  }
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8f5f0' },
  handle:              { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 8 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title:               { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  closeBtn:            { fontSize: 18, color: '#999' },
  form:                { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  label:               { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#e0e0e0',
    backgroundColor: '#fff', marginBottom: 8,
  },
  optionRowActive:     { borderColor: '#2d5a27', backgroundColor: '#f0f8f0' },
  optionText:          { fontSize: 15, color: '#333' },
  optionTextActive:    { color: '#1a1a1a', fontWeight: '600' },
  checkmark:           { color: '#2d5a27', fontSize: 16, fontWeight: '700' },
  careGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  careChip: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  careChipActive:      { borderColor: '#2d5a27', backgroundColor: '#2d5a27' },
  careChipIcon:        { fontSize: 18, marginBottom: 3 },
  careChipText:        { fontSize: 12, color: '#555', fontWeight: '600', textTransform: 'capitalize' },
  careChipTextActive:  { color: '#fff' },
  dueGrid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dueChip: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  dueChipActive:       { borderColor: '#2d5a27', backgroundColor: '#2d5a27' },
  dueChipText:         { fontSize: 13, color: '#555', fontWeight: '500' },
  dueChipTextActive:   { color: '#fff', fontWeight: '700' },
  footer: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  saveBtn:             { backgroundColor: '#2d5a27', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled:     { opacity: 0.6 },
  saveBtnText:         { color: '#fff', fontSize: 16, fontWeight: '700' },
})
