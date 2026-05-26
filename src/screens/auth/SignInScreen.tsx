import React, { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  async function handleEmailAuth() {
    setLoading(true)
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yard Plant Map</Text>
      <Text style={styles.subtitle}>Your yard, organized.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleEmailAuth} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={styles.toggle}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title:     { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#2d5a27' },
  subtitle:  { fontSize: 16, textAlign: 'center', marginBottom: 40, color: '#666' },
  input:     { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  button:    { backgroundColor: '#2d5a27', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  buttonText:{ color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle:    { textAlign: 'center', color: '#2d5a27', fontSize: 14 },
})
