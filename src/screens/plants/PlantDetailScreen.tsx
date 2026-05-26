import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { Plant, CareEvent, CareEventType } from '../../types'

const CARE_TYPES: CareEventType[] = ['watering', 'fertilizing', 'pruning', 'treatment', 'transplanting', 'other']

const CARE_ICONS: Record<CareEventType, string> = {
  watering:     '💧',
  fertilizing:  '🌿',
  pruning:      '✂️',
  treatment:    '💊',
  transplanting:'🪴',
  other:        '📝',
}

export default function PlantDetailScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { plantId } = route.params

  const [plant, setPlant] = useState<Plant | null>(null)
  const [careEvents, setCareEvents] = useState<CareEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [plantId])

  async function loadData() {
    const [{ data: plantData }, { data: events }] = await Promise.all([
      supabase.from('plants').select('*').eq('id', plantId).single(),
      supabase
        .from('care_events')
        .select('*')
        .eq('plant_id', plantId)
        .order('occurred_at', { ascending: false })
        .limit(20),
    ])
    if (plantData) {
      setPlant(plantData)
      navigation.setOptions({ title: plantData.common_name })
    }
    setCareEvents(events ?? [])
    setLoading(false)
  }

  async function logCareEvent(eventType: CareEventType) {
    if (!plant) return
    const { data: event, error } = await supabase
      .from('care_events')
      .insert({ plant_id: plant.id, event_type: eventType })
      .select()
      .single()
    if (error) { Alert.alert('Error', error.message); return }
    setCareEvents(prev => [event, ...prev])
  }

  if (loading) return <ActivityIndicator style={styles.centered} size="large" color="#2d5a27" />
  if (!plant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Plant not found.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.plantHeader}>
        <Text style={styles.commonName}>{plant.common_name}</Text>
        {plant.botanical_name ? (
          <Text style={styles.botanicalName}>{plant.botanical_name}</Text>
        ) : null}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{plant.plant_type}</Text>
        </View>
        {plant.date_planted ? (
          <Text style={styles.datePlanted}>
            Planted: {new Date(plant.date_planted).toLocaleDateString()}
          </Text>
        ) : null}
      </View>

      {plant.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesBody}>{plant.notes}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log Care</Text>
        <View style={styles.careGrid}>
          {CARE_TYPES.map(type => (
            <Pressable key={type} style={styles.careBtn} onPress={() => logCareEvent(type)}>
              <Text style={styles.careIcon}>{CARE_ICONS[type]}</Text>
              <Text style={styles.careBtnText}>{type}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {careEvents.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care History</Text>
          {careEvents.map(event => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>{CARE_ICONS[event.event_type]}</Text>
              <View style={styles.eventInfo}>
                <Text style={styles.eventType}>{event.event_type}</Text>
                {event.notes ? <Text style={styles.eventNotes}>{event.notes}</Text> : null}
              </View>
              <Text style={styles.eventDate}>
                {new Date(event.occurred_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:       { color: '#999', fontSize: 16 },
  container:       { flex: 1, backgroundColor: '#f8f5f0' },
  content:         { padding: 20, paddingBottom: 40 },
  plantHeader:     { marginBottom: 24 },
  commonName:      { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  botanicalName:   { fontSize: 15, color: '#666', fontStyle: 'italic', marginBottom: 10 },
  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: '#2d5a27',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8,
  },
  typeBadgeText:   { color: '#fff', fontSize: 13, fontWeight: '600' },
  datePlanted:     { fontSize: 13, color: '#888' },
  section:         { marginBottom: 24 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  notesBody:       { fontSize: 15, color: '#555', lineHeight: 22 },
  careGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  careBtn: {
    alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5,
    borderColor: '#ddd', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    minWidth: 88,
  },
  careIcon:        { fontSize: 20, marginBottom: 4 },
  careBtnText:     { fontSize: 12, color: '#444', fontWeight: '600' },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8, gap: 10,
  },
  eventIcon:       { fontSize: 18 },
  eventInfo:       { flex: 1 },
  eventType:       { fontSize: 14, fontWeight: '600', color: '#333', textTransform: 'capitalize' },
  eventNotes:      { fontSize: 13, color: '#666', marginTop: 2 },
  eventDate:       { fontSize: 12, color: '#999' },
})
