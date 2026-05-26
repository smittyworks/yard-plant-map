import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// Phase 4: implement care reminders
// See issue #13 — Care reminders: generation and scheduling

export default function RemindersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Upcoming care reminders.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f5f0' },
  placeholder: { fontSize: 18, color: '#666' },
})
