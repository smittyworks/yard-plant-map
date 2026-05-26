import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// Phase 2: implement the yard grid using React Native Skia
// See issue #5 — Map screen: yard grid with plant markers

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Your yard map goes here.</Text>
      <Text style={styles.hint}>Tap + to add your first plant.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f5f0' },
  placeholder: { fontSize: 18, color: '#666', marginBottom: 8 },
  hint:        { fontSize: 14, color: '#999' },
})
