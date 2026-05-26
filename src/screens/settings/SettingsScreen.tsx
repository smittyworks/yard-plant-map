import React from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen() {
  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {/* Phase 4: yard name/size, hardiness zone, notification prefs — see issue #16 */}
      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 24, backgroundColor: '#f8f5f0' },
  title:        { fontSize: 24, fontWeight: '700', marginBottom: 24, color: '#2d5a27' },
  signOut:      { marginTop: 'auto', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#c00', alignItems: 'center' },
  signOutText:  { color: '#c00', fontSize: 16 },
})
