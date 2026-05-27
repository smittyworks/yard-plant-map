import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { Yard, YARD_SIZE_PRESETS, YardSizePreset } from '../../types'

interface Props {
  onClose: () => void
  onCreated: (yard: Yard) => void
}

export default function AddYardModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [size, setSize] = useState<YardSizePreset>('M')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const preset = YARD_SIZE_PRESETS[size]
      const { data: yard, error } = await supabase
        .from('yards')
        .insert({
          user_id: user.id,
          name: name.trim() || 'New Yard',
          grid_width: preset.width,
          grid_height: preset.height,
        })
        .select()
        .single()
      if (error) throw error
      onCreated(yard)
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
          <Text style={styles.title}>New Yard</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Front Yard, Back Garden..."
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Size</Text>
          {(Object.entries(YARD_SIZE_PRESETS) as [YardSizePreset, { width: number; height: number; label: string }][]).map(([key, preset]) => (
            <Pressable
              key={key}
              style={[styles.sizeCard, size === key && styles.sizeCardActive]}
              onPress={() => setSize(key)}
            >
              <Text style={[styles.sizeKey, size === key && styles.sizeKeyActive]}>{key}</Text>
              <View>
                <Text style={[styles.sizeLabel, size === key && styles.sizeLabelActive]}>{preset.label}</Text>
                <Text style={[styles.sizeDims, size === key && styles.sizeDimsActive]}>
                  {preset.width} × {preset.height} cells
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Create Yard</Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f8f5f0' },
  handle:           { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 8 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title:            { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  closeBtn:         { fontSize: 18, color: '#999' },
  form:             { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  label:            { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, backgroundColor: '#fff', color: '#1a1a1a',
  },
  sizeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 12,
    padding: 16, marginBottom: 10, backgroundColor: '#fff',
  },
  sizeCardActive:   { borderColor: '#2d5a27', backgroundColor: '#f0f8f0' },
  sizeKey:          { fontSize: 22, fontWeight: '800', color: '#999', width: 32 },
  sizeKeyActive:    { color: '#2d5a27' },
  sizeLabel:        { fontSize: 15, fontWeight: '600', color: '#333' },
  sizeLabelActive:  { color: '#1a1a1a' },
  sizeDims:         { fontSize: 13, color: '#aaa', marginTop: 2 },
  sizeDimsActive:   { color: '#4a7c40' },
  footer:           { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  saveBtn:          { backgroundColor: '#2d5a27', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled:  { opacity: 0.6 },
  saveBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
})
