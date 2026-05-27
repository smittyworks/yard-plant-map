import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { Reminder, CareEventType } from '../../types'
import AddReminderModal from './AddReminderModal'

const CARE_ICONS: Record<CareEventType, string> = {
  watering:      '💧',
  fertilizing:   '🌿',
  pruning:       '✂️',
  treatment:     '💊',
  transplanting: '🪴',
  other:         '📝',
}

interface ReminderWithPlant extends Reminder {
  plant_name: string
}

export default function RemindersScreen() {
  const navigation = useNavigation<any>()
  const [reminders, setReminders] = useState<ReminderWithPlant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useFocusEffect(
    useCallback(() => { loadReminders() }, [])
  )

  async function loadReminders() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Load incomplete reminders joined with plant name, ordered by due date
    const { data } = await supabase
      .from('reminders')
      .select('*, plants(common_name, yard_id, yards(user_id))')
      .is('completed_at', null)
      .order('due_date', { ascending: true })

    // Filter to only this user's plants
    const filtered = (data ?? [])
      .filter((r: any) => r.plants?.yards?.user_id === user.id)
      .map((r: any) => ({ ...r, plant_name: r.plants?.common_name ?? 'Unknown plant' }))

    setReminders(filtered)
    setLoading(false)
  }

  async function markComplete(reminder: ReminderWithPlant) {
    const { error } = await supabase
      .from('reminders')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', reminder.id)

    if (error) { Alert.alert('Error', error.message); return }

    // Also log a care event
    await supabase.from('care_events').insert({
      plant_id: reminder.plant_id,
      event_type: reminder.reminder_type,
    })

    setReminders(prev => prev.filter(r => r.id !== reminder.id))
  }

  function getDueLabel(dueDateStr: string): { label: string; urgent: boolean } {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDateStr)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0)  return { label: `${Math.abs(diffDays)}d overdue`, urgent: true }
    if (diffDays === 0) return { label: 'Due today', urgent: true }
    if (diffDays === 1) return { label: 'Due tomorrow', urgent: false }
    return { label: `Due in ${diffDays}d`, urgent: false }
  }

  if (loading) return <ActivityIndicator style={styles.centered} size="large" color="#2d5a27" />

  return (
    <View style={styles.container}>
      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>No upcoming reminders</Text>
          <Text style={styles.emptySubtitle}>Tap + to schedule care for a plant.</Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const { label, urgent } = getDueLabel(item.due_date)
            return (
              <View style={styles.card}>
                <Text style={styles.cardIcon}>{CARE_ICONS[item.reminder_type]}</Text>
                <Pressable
                  style={styles.cardBody}
                  onPress={() => navigation.navigate('MapTab', {
                    screen: 'PlantDetail',
                    params: { plantId: item.plant_id },
                  })}
                >
                  <Text style={styles.cardPlant}>{item.plant_name}</Text>
                  <Text style={styles.cardType}>{item.reminder_type}</Text>
                  <Text style={[styles.cardDue, urgent && styles.cardDueUrgent]}>{label}</Text>
                </Pressable>
                <Pressable style={styles.doneBtn} onPress={() => markComplete(item)}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            )
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {showAdd ? (
        <AddReminderModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); loadReminders() }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8f5f0' },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  emptySubtitle:   { fontSize: 15, color: '#666', textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardIcon:        { fontSize: 24 },
  cardBody:        { flex: 1 },
  cardPlant:       { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardType:        { fontSize: 13, color: '#666', textTransform: 'capitalize', marginTop: 2 },
  cardDue:         { fontSize: 12, color: '#888', marginTop: 3 },
  cardDueUrgent:   { color: '#c0392b', fontWeight: '700' },
  doneBtn: {
    backgroundColor: '#2d5a27', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  doneBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 32, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2d5a27', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  fabText:         { color: '#fff', fontSize: 32, lineHeight: 36, fontWeight: '300' },
})
