import * as AppleAuthentication from 'expo-apple-authentication'
import React, { useEffect, useState } from 'react'
import { Alert, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [appleAvailable, setAppleAvailable] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
    }
  }, [])

  async function handleEmailAuth() {
    setLoading(true)
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) {
        Alert.alert('Error', 'Sign in with Apple failed — no identity token returned.')
        return
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      if (error) Alert.alert('Error', error.message)
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', e.message)
      }
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>Que Plante</Text>
      <Text style={styles.subtitle}>Your yard, mapped.</Text>

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

      {appleAvailable && (
        <>
          <Text style={styles.divider}>or</Text>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo:        { width: 100, height: 100, borderRadius: 22, alignSelf: 'center', marginBottom: 16 },
  title:       { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#2d5a27' },
  subtitle:    { fontSize: 16, textAlign: 'center', marginBottom: 40, color: '#666' },
  input:       { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  button:      { backgroundColor: '#2d5a27', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  buttonText:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle:      { textAlign: 'center', color: '#2d5a27', fontSize: 14 },
  divider:     { textAlign: 'center', color: '#999', marginVertical: 16, fontSize: 14 },
  appleButton: { width: '100%', height: 48 },
})
