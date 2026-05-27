import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation } from '@react-navigation/native'
import { identifyPlant } from '../../lib/plantnet'
import { PlantIdentificationResult } from '../../types'

type Step = 'capture' | 'identifying' | 'results'

interface Props {
  yardId: string
  onConfirm: (result: PlantIdentificationResult, photoUri: string) => void
  onCancel: () => void
}

export default function IdentifyPlantScreen({ yardId, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<Step>('capture')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [results, setResults] = useState<PlantIdentificationResult[]>([])
  const [error, setError] = useState<string | null>(null)

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to identify plants.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })
    if (!result.canceled) {
      await runIdentification(result.assets[0].uri)
    }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    })
    if (!result.canceled) {
      await runIdentification(result.assets[0].uri)
    }
  }

  async function runIdentification(uri: string) {
    setPhotoUri(uri)
    setStep('identifying')
    setError(null)
    try {
      const matches = await identifyPlant(uri)
      if (!matches.length) {
        setError("Couldn't identify this plant. Try a clearer photo of the leaves or flowers.")
        setStep('capture')
        return
      }
      setResults(matches)
      setStep('results')
    } catch (e: any) {
      setError(e.message ?? 'Identification failed.')
      setStep('capture')
    }
  }

  if (step === 'identifying') {
    return (
      <View style={styles.centered}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
        ) : null}
        <ActivityIndicator size="large" color="#2d5a27" style={{ marginTop: 24 }} />
        <Text style={styles.identifyingText}>Identifying plant...</Text>
      </View>
    )
  }

  if (step === 'results' && results.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Best Matches</Text>
          <Pressable onPress={onCancel} hitSlop={12}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </Pressable>
        </View>

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.resultPhoto} />
        ) : null}

        <ScrollView style={styles.resultsList}>
          {results.map((r, i) => (
            <Pressable
              key={i}
              style={[styles.resultRow, i === 0 && styles.resultRowTop]}
              onPress={() => onConfirm(r, photoUri!)}
            >
              <View style={styles.resultInfo}>
                <Text style={styles.resultCommon}>{r.commonName}</Text>
                <Text style={styles.resultBotanical}>{r.botanicalName}</Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(r.confidence * 100)}%
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}

          <Pressable style={styles.manualRow} onPress={() => onConfirm({ commonName: '', botanicalName: '', confidence: 0 }, photoUri ?? '')}>
            <Text style={styles.manualText}>None of these — enter manually</Text>
          </Pressable>
        </ScrollView>
      </View>
    )
  }

  // Step: capture
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Identify a Plant</Text>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.captureArea}>
        <Text style={styles.captureEmoji}>🌿</Text>
        <Text style={styles.captureHint}>
          Take a clear photo of the plant's leaves, flowers, or fruit for best results.
        </Text>

        <Pressable style={styles.primaryButton} onPress={takePhoto}>
          <Text style={styles.primaryButtonText}>📷  Take Photo</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={pickFromLibrary}>
          <Text style={styles.secondaryButtonText}>🖼  Choose from Library</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f8f5f0' },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f5f0', padding: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title:              { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  cancelBtn:          { fontSize: 16, color: '#2d5a27', fontWeight: '600' },
  errorBanner:        { backgroundColor: '#fff3cd', padding: 14, marginHorizontal: 20, marginTop: 12, borderRadius: 10 },
  errorText:          { fontSize: 14, color: '#856404' },
  captureArea:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  captureEmoji:       { fontSize: 64, marginBottom: 16 },
  captureHint:        { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  primaryButton: {
    backgroundColor: '#2d5a27', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 32,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  primaryButtonText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1.5, borderColor: '#2d5a27', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 32,
    alignItems: 'center', width: '100%',
  },
  secondaryButtonText: { color: '#2d5a27', fontSize: 16, fontWeight: '600' },
  previewImage:       { width: 240, height: 240, borderRadius: 16 },
  identifyingText:    { marginTop: 16, fontSize: 16, color: '#555' },
  resultPhoto:        { width: '100%', height: 180, resizeMode: 'cover' },
  resultsList:        { flex: 1, paddingTop: 8 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 20, paddingVertical: 14, marginHorizontal: 16,
    marginBottom: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  resultRowTop:       { borderColor: '#2d5a27', backgroundColor: '#f0f8f0' },
  resultInfo:         { flex: 1, marginRight: 12 },
  resultCommon:       { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  resultBotanical:    { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 2 },
  confidenceBadge: {
    backgroundColor: '#2d5a27', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
  },
  confidenceText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  chevron:            { fontSize: 22, color: '#ccc' },
  manualRow: {
    alignItems: 'center', paddingVertical: 16, marginHorizontal: 16,
    marginTop: 4, marginBottom: 24,
  },
  manualText:         { fontSize: 14, color: '#888', textDecorationLine: 'underline' },
})
