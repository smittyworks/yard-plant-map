import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { FeatureType, FEATURE_COLORS, FEATURE_ICONS } from '../../types'

const FEATURE_TYPES: FeatureType[] = ['patio', 'pool', 'deck', 'driveway', 'shed', 'garden_bed', 'walkway', 'other']

const FEATURE_LABELS: Record<FeatureType, string> = {
  patio:      'Patio',
  pool:       'Pool',
  deck:       'Deck',
  driveway:   'Driveway',
  shed:       'Shed',
  garden_bed: 'Garden Bed',
  walkway:    'Walkway',
  other:      'Other',
}

interface Props {
  onClose: () => void
  onConfirm: (featureType: FeatureType, label: string) => void
}

export default function AddFeatureModal({ onClose, onConfirm }: Props) {
  const [featureType, setFeatureType] = useState<FeatureType>('patio')
  const [label, setLabel] = useState('')

  function handleConfirm() {
    onConfirm(featureType, label.trim() || FEATURE_LABELS[featureType])
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Add Feature</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {FEATURE_TYPES.map(t => (
              <Pressable
                key={t}
                style={[
                  styles.typeCard,
                  featureType === t && { borderColor: FEATURE_COLORS[t], backgroundColor: FEATURE_COLORS[t] + '22' },
                ]}
                onPress={() => setFeatureType(t)}
              >
                <Text style={styles.typeIcon}>{FEATURE_ICONS[t]}</Text>
                <Text style={[styles.typeLabel, featureType === t && { fontWeight: '700', color: '#1a1a1a' }]}>
                  {FEATURE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>Custom Label (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder={FEATURE_LABELS[featureType]}
            placeholderTextColor="#aaa"
            value={label}
            onChangeText={setLabel}
          />

          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              After tapping Next, tap the <Text style={styles.bold}>top-left</Text> cell of the feature on the map, then tap the <Text style={styles.bold}>bottom-right</Text> cell to set its size.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Next: Place on Map →</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8f5f0' },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 8 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title:          { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  closeBtn:       { fontSize: 18, color: '#999' },
  form:           { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  label:          { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 10 },
  typeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    alignItems: 'center', width: '22%', paddingVertical: 12,
    borderRadius: 12, borderWidth: 2, borderColor: '#e0e0e0', backgroundColor: '#fff',
  },
  typeIcon:       { fontSize: 24, marginBottom: 4 },
  typeLabel:      { fontSize: 11, color: '#666', textAlign: 'center' },
  input: {
    borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, backgroundColor: '#fff', color: '#1a1a1a',
  },
  instructionBox: {
    marginTop: 20, backgroundColor: '#e8f5e2', borderRadius: 10, padding: 14,
  },
  instructionText: { fontSize: 14, color: '#2d5a27', lineHeight: 20 },
  bold:           { fontWeight: '700' },
  footer: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  confirmBtn:     { backgroundColor: '#2d5a27', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
