import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { Plant } from '../../types'

export default function UnplacedPlantsScreen() {
  const navigation = useNavigation<any>()
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      loadUnplaced()
    }, [])
  )

  async function loadUnplaced() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: yards } = await supabase
      .from('yards').select('id').eq('user_id', user.id).limit(1)
    if (!yards?.length) { setLoading(false); return }

    const { data } = await supabase
      .from('plants')
      .select('*')
      .eq('yard_id', yards[0].id)
      .eq('placed', false)
      .order('created_at', { ascending: false })

    setPlants(data ?? [])
    setLoading(false)
  }

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" color="#2d5a27" />
  }

  if (!plants.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyTitle}>All planted!</Text>
        <Text style={styles.emptySubtitle}>Every plant is placed on your map.</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back to Map</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      data={plants}
      keyExtractor={p => p.id}
      contentContainerStyle={{ paddingVertical: 12 }}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.plantName}>{item.common_name}</Text>
            {item.botanical_name ? (
              <Text style={styles.botanicalName}>{item.botanical_name}</Text>
            ) : null}
          </View>
          <View style={styles.rowRight}>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{item.plant_type}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  )
}

const styles = StyleSheet.create({
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  emptySubtitle:   { fontSize: 15, color: '#666', marginBottom: 24, textAlign: 'center' },
  backBtn:         { borderWidth: 1.5, borderColor: '#2d5a27', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText:     { color: '#2d5a27', fontWeight: '600', fontSize: 15 },
  list:            { flex: 1, backgroundColor: '#f8f5f0' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, marginHorizontal: 16,
    borderRadius: 12,
  },
  rowLeft:         { flex: 1, marginRight: 12 },
  plantName:       { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  botanicalName:   { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 2 },
  rowRight:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: {
    backgroundColor: '#e8f5e2', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  typePillText:    { fontSize: 12, color: '#2d5a27', fontWeight: '600' },
  chevron:         { fontSize: 22, color: '#ccc' },
  separator:       { height: 8 },
})
