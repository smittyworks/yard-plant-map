import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { Plant, PlantType } from '../../types'

const PLANT_TYPES: PlantType[] = ['tree', 'shrub', 'perennial', 'annual', 'vine', 'grass', 'bulb', 'other']

interface Props {
  yardId: string
  onClose: () => void
  onAdded: (plant: Plant, placeNow: boolean) => void
  prefill?: { commonName?: string; botanicalName?: string }
}

export default function AddPlantModal({ yardId, onClose, onAdded, prefill }: Props) {
  const [commonName, setCommonName] = useState(prefill?.commonName ?? '')
  const [botanicalName, setBotanicalName] = useState(prefill?.botanicalName ?? '')
  const [plantType, setPlantType] = useState<PlantType>('other')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave(placeNow: boolean) {
    if (!commonName.trim()) {
      Alert.alert('Name required', 'Please enter a plant name.')
      return
    }
    setSaving(true)
    try {
      const { data: plant, error } = await supabase
        .from('plants')
        .insert({
          yard_id: yardId,
          common_name: commonName.trim(),
          botanical_name: botanicalName.trim() || null,
          plant_type: plantType,
          notes: notes.trim() || null,
          placed: false,
        })
        .select()
        .single()

      if (error) throw error
      onAdded(plant, placeNow)
    } catch (e: any) {
      Alert.alert('Error', e.message)
      setSaving(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Add Plant</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Common Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Black-eyed Susan"
            placeholderTextColor="#aaa"
            value={commonName}
            onChangeText={setCommonName}
            autoFocus
            returnKeyType="next"
          />

          <Text style={styles.label}>Botanical Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rudbeckia hirta"
            placeholderTextColor="#aaa"
            value={botanicalName}
            onChangeText={setBotanicalName}
            returnKeyType="next"
          />

          <Text style={styles.label}>Plant Type</Text>
          <View style={styles.typeGrid}>
            {PLANT_TYPES.map(t => (
              <Pressable
                key={t}
                style={[styles.typeChip, plantType === t && styles.typeChipActive]}
                onPress={() => setPlantType(t)}
              >
                <Text style={[styles.typeChipText, plantType === t && styles.typeChipTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any details about this plant..."
            placeholderTextColor="#aaa"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.skipBtn, saving && styles.btnDisabled]}
            onPress={() => handleSave(false)}
            disabled={saving}
          >
            <Text style={styles.skipBtnText}>Save, place later</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.placeBtn, saving && styles.btnDisabled]}
            onPress={() => handleSave(true)}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.placeBtnText}>Place on Map →</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8f5f0' },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 8 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title:           { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  closeBtn:        { fontSize: 18, color: '#999' },
  form:            { flex: 1, paddingHorizontal: 20 },
  label:           { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, backgroundColor: '#fff', color: '#1a1a1a', marginBottom: 16,
  },
  notesInput:      { height: 80, paddingTop: 12 },
  typeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff',
  },
  typeChipActive:  { borderColor: '#2d5a27', backgroundColor: '#2d5a27' },
  typeChipText:    { fontSize: 13, color: '#555' },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
  actions: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20,
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#eee',
  },
  actionBtn:       { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDisabled:     { opacity: 0.6 },
  skipBtn:         { borderWidth: 1.5, borderColor: '#2d5a27', backgroundColor: '#fff' },
  skipBtnText:     { color: '#2d5a27', fontWeight: '600', fontSize: 14 },
  placeBtn:        { backgroundColor: '#2d5a27' },
  placeBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
})
