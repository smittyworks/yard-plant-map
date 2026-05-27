import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Yard } from '../types'

import SignInScreen from '../screens/auth/SignInScreen'
import OnboardingScreen from '../screens/onboarding/OnboardingScreen'
import MapScreen from '../screens/map/MapScreen'
import RemindersScreen from '../screens/reminders/RemindersScreen'
import SettingsScreen from '../screens/settings/SettingsScreen'
import PlantDetailScreen from '../screens/plants/PlantDetailScreen'
import UnplacedPlantsScreen from '../screens/plants/UnplacedPlantsScreen'

const Tab      = createBottomTabNavigator()
const RootStack = createNativeStackNavigator()
const MapStack  = createNativeStackNavigator()

const HEADER_OPTS = {
  headerStyle:      { backgroundColor: '#2d5a27' },
  headerTintColor:  '#fff' as const,
  headerTitleStyle: { fontWeight: '700' as const },
}

function MapStackNavigator() {
  return (
    <MapStack.Navigator screenOptions={HEADER_OPTS}>
      <MapStack.Screen name="MapHome"       component={MapScreen}          options={{ title: 'My Yard' }} />
      <MapStack.Screen name="UnplacedPlants" component={UnplacedPlantsScreen} options={{ title: 'Unplaced Plants' }} />
      <MapStack.Screen name="PlantDetail"   component={PlantDetailScreen}  options={{ title: 'Plant' }} />
    </MapStack.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:           false,
        tabBarActiveTintColor: '#2d5a27',
        tabBarInactiveTintColor: '#999',
        tabBarStyle:           { backgroundColor: '#fff' },
      }}
    >
      <Tab.Screen
        name="MapTab"
        component={MapStackNavigator}
        options={{
          title: 'My Yard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🗺</Text>,
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⏰</Text>,
          headerShown: true,
          ...HEADER_OPTS,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
          headerShown: true,
          ...HEADER_OPTS,
        }}
      />
    </Tab.Navigator>
  )
}

export default function Navigation() {
  const [session,  setSession]  = useState<Session | null>(null)
  const [hasYard,  setHasYard]  = useState<boolean>(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        checkYard(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        checkYard(session.user.id)
      } else {
        setHasYard(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkYard(userId: string) {
    const { data } = await supabase
      .from('yards').select('id').eq('user_id', userId).maybeSingle()
    setHasYard(!!data)
    setLoading(false)
  }

  if (loading) return null

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <RootStack.Screen name="SignIn" component={SignInScreen} />
        ) : !hasYard ? (
          <RootStack.Screen name="Onboarding">
            {() => (
              <OnboardingScreen onYardCreated={(_yard: Yard) => setHasYard(true)} />
            )}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
