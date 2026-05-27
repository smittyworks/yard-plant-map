import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Svg, { Circle, Line, Rect } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { Plant, PlantIdentificationResult, PlantType, Yard } from '../../types'
import { FREE_TIER_PLANT_LIMIT } from '../../constants'
import AddPlantModal from '../plants/AddPlantModal'
import IdentifyPlantScreen from '../plants/IdentifyPlantScreen'
import PaywallScreen from '../paywall/PaywallScreen'
import { usePremium } from '../../hooks/usePremium'

const CELL_PX = 60

const PLANT_COLORS: Record<PlantType, string> = {
  tree:         '#1a5f1a',
  shrub:        '#3d8b37',
  perennial:    '#6dbf67',
  annual:       '#f0a500',
  vine:         '#7a3f00',
  grass:        '#8bc34a',
  bulb:         '#9c27b0',
  other:        '#78909c',
}

export default function MapScreen() {
  const navigation = useNavigation<any>()

  const [yard, setYard] = useState<Yard | null>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showIdentify, setShowIdentify] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [fabExpanded, setFabExpanded] = useState(false)
  const [prefill, setPrefill] = useState<{ commonName?: string; botanicalName?: string } | undefined>()
  const [placingPlantId, setPlacingPlantId] = useState<string | null>(null)

  const { atLimit, isPremium, plantCount, refresh: refreshPremium } = usePremium(yard?.id ?? null)

  // Pan using React Native's Animated
  const animPan = useRef(new Animated.ValueXY({ x: 20, y: 20 })).current
  const panOffsetRef = useRef({ x: 20, y: 20 })
  // gs.x0/y0 are page-level coords; subtract canvasArea's screen position to get canvas-relative coords
  const canvasAreaRef = useRef<View>(null)
  const canvasAreaPagePos = useRef({ x: 0, y: 0 })
  const touchStartCanvasPos = useRef({ x: 0, y: 0 })

  // Refs so PanResponder closures always read current values
  const placingPlantIdRef = useRef<string | null>(null)
  const plantsRef = useRef<Plant[]>([])
  const yardRef = useRef<Yard | null>(null)

  useEffect(() => { placingPlantIdRef.current = placingPlantId }, [placingPlantId])
  useEffect(() => { plantsRef.current = plants }, [plants])
  useEffect(() => { yardRef.current = yard }, [yard])

  function onCanvasAreaLayout() {
    canvasAreaRef.current?.measureInWindow((x, y) => {
      canvasAreaPagePos.current = { x, y }
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onPanResponderGrant: (_, gs) => {
        // gs.x0/y0 are absolute page coordinates — subtract canvasArea's screen position
        // to get a coordinate relative to canvasArea regardless of which child was touched
        const relX = gs.x0 - canvasAreaPagePos.current.x
        const relY = gs.y0 - canvasAreaPagePos.current.y
        touchStartCanvasPos.current = {
          x: relX - panOffsetRef.current.x,
          y: relY - panOffsetRef.current.y,
        }
        animPan.setOffset(panOffsetRef.current)
        animPan.setValue({ x: 0, y: 0 })
      },

      onPanResponderMove: Animated.event(
        [null, { dx: animPan.x, dy: animPan.y }],
        { useNativeDriver: false },
      ),

      onPanResponderRelease: (_, gs) => {
        panOffsetRef.current = {
          x: panOffsetRef.current.x + gs.dx,
          y: panOffsetRef.current.y + gs.dy,
        }
        animPan.flattenOffset()

        if (Math.abs(gs.dx) < 6 && Math.abs(gs.dy) < 6) {
          handleCanvasTap(
            touchStartCanvasPos.current.x,
            touchStartCanvasPos.current.y,
          )
        }
      },
    })
  ).current

  function handleCanvasTap(canvasX: number, canvasY: number) {
    const currentYard = yardRef.current
    if (!currentYard) return

    const pId = placingPlantIdRef.current
    if (pId) {
      const gx = Math.floor(canvasX / CELL_PX)
      const gy = Math.floor(canvasY / CELL_PX)
      if (gx >= 0 && gx < currentYard.grid_width && gy >= 0 && gy < currentYard.grid_height) {
        placePlant(pId, gx, gy)
      }
      return
    }

    const tapped = plantsRef.current.find(p => {
      if (!p.placed || p.grid_x == null || p.grid_y == null) return false
      const mx = p.grid_x * CELL_PX + CELL_PX / 2
      const my = p.grid_y * CELL_PX + CELL_PX / 2
      return Math.sqrt((canvasX - mx) ** 2 + (canvasY - my) ** 2) <= CELL_PX * 0.4
    })
    if (tapped) navigation.navigate('PlantDetail', { plantId: tapped.id })
  }

  async function placePlant(plantId: string, gridX: number, gridY: number) {
    const { data: updated, error } = await supabase
      .from('plants')
      .update({ grid_x: gridX, grid_y: gridY, placed: true })
      .eq('id', plantId)
      .select()
      .single()

    if (error) { Alert.alert('Error', error.message); return }
    setPlants(prev => prev.map(p => p.id === plantId ? updated : p))
    setPlacingPlantId(null)
  }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: yardData } = await supabase
        .from('yards').select('*').eq('user_id', user.id).maybeSingle()
      if (!yardData) return

      setYard(yardData)
      const { data: plantsData } = await supabase
        .from('plants').select('*').eq('yard_id', yardData.id).order('created_at')
      setPlants(plantsData ?? [])
    } finally {
      setLoading(false)
    }
  }

  function handlePlantAdded(plant: Plant, placeNow: boolean) {
    setPlants(prev => [...prev, plant])
    setShowAddModal(false)
    if (yard) refreshPremium(yard.id)
    if (placeNow) setPlacingPlantId(plant.id)
  }

  function handleFabAction(action: 'identify' | 'manual') {
    setFabExpanded(false)
    if (atLimit) { setShowPaywall(true); return }
    if (action === 'identify') setShowIdentify(true)
    else { setPrefill(undefined); setShowAddModal(true) }
  }

  // Build grid lines once per yard size change
  const gridLines = useMemo(() => {
    if (!yard) return { verticals: [], horizontals: [] }
    const w = yard.grid_width * CELL_PX
    const h = yard.grid_height * CELL_PX
    const verticals = Array.from({ length: yard.grid_width + 1 }, (_, i) => i * CELL_PX)
    const horizontals = Array.from({ length: yard.grid_height + 1 }, (_, i) => i * CELL_PX)
    return { verticals, horizontals, w, h }
  }, [yard?.grid_width, yard?.grid_height])

  const unplacedCount = plants.filter(p => !p.placed).length

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Loading your yard...</Text>
      </View>
    )
  }

  if (!yard) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>No yard found.</Text>
      </View>
    )
  }

  const canvasWidth  = yard.grid_width  * CELL_PX
  const canvasHeight = yard.grid_height * CELL_PX

  return (
    <View style={styles.container}>
      {placingPlantId ? (
        <View style={styles.placingBanner}>
          <Text style={styles.placingText}>Tap a cell to place your plant</Text>
          <Pressable onPress={() => setPlacingPlantId(null)} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        ref={canvasAreaRef}
        style={styles.canvasArea}
        onLayout={onCanvasAreaLayout}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: [{ translateX: animPan.x }, { translateY: animPan.y }],
          }}
        >
          <Svg width={canvasWidth} height={canvasHeight}>
            {/* Yard background */}
            <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#e8f5e2" />

            {/* Grid lines */}
            {gridLines.verticals?.map(x => (
              <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={canvasHeight}
                stroke="#c0d8bb" strokeWidth={1} />
            ))}
            {gridLines.horizontals?.map(y => (
              <Line key={`h${y}`} x1={0} y1={y} x2={canvasWidth} y2={y}
                stroke="#c0d8bb" strokeWidth={1} />
            ))}

            {/* Yard border */}
            <Rect x={1} y={1} width={canvasWidth - 2} height={canvasHeight - 2}
              fill="none" stroke="#4a7c40" strokeWidth={2} />

            {/* Plant markers */}
            {plants
              .filter(p => p.placed && p.grid_x != null && p.grid_y != null)
              .map(p => (
                <Circle
                  key={p.id}
                  cx={p.grid_x! * CELL_PX + CELL_PX / 2}
                  cy={p.grid_y! * CELL_PX + CELL_PX / 2}
                  r={CELL_PX * 0.33}
                  fill={PLANT_COLORS[p.plant_type]}
                />
              ))
            }
          </Svg>
        </Animated.View>
      </View>

      {unplacedCount > 0 ? (
        <Pressable
          style={styles.unplacedBadge}
          onPress={() => navigation.navigate('UnplacedPlants')}
        >
          <Text style={styles.unplacedBadgeText}>{unplacedCount} unplaced</Text>
        </Pressable>
      ) : null}

      {/* Legend — only show types that have placed plants */}
      <View style={styles.legend}>
        {(Object.entries(PLANT_COLORS) as [PlantType, string][]).map(([type, color]) => {
          if (!plants.some(p => p.plant_type === type && p.placed)) return null
          return (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{type}</Text>
            </View>
          )
        })}
      </View>

      {/* FAB — tap to expand, shows two options */}
      {fabExpanded ? (
        <>
          <Pressable style={styles.fabOverlay} onPress={() => setFabExpanded(false)} />
          <View style={styles.fabMenu}>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => handleFabAction('identify')}
            >
              <Text style={styles.fabMenuIcon}>📷</Text>
              <Text style={styles.fabMenuLabel}>Identify with Camera</Text>
            </Pressable>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => handleFabAction('manual')}
            >
              <Text style={styles.fabMenuIcon}>✏️</Text>
              <Text style={styles.fabMenuLabel}>Add Manually</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {!isPremium && !fabExpanded ? (
        <Pressable style={styles.plantCounter} onPress={() => setShowPaywall(true)}>
          <Text style={styles.plantCounterText}>
            {Math.max(0, FREE_TIER_PLANT_LIMIT - plantCount)} plants left
          </Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.fab} onPress={() => setFabExpanded(e => !e)}>
        <Text style={[styles.fabText, fabExpanded && styles.fabTextOpen]}>+</Text>
      </Pressable>

      {showAddModal ? (
        <AddPlantModal
          yardId={yard.id}
          prefill={prefill}
          onClose={() => { setShowAddModal(false); setPrefill(undefined) }}
          onAdded={handlePlantAdded}
        />
      ) : null}

      {showPaywall ? (
        <PaywallScreen
          onClose={() => setShowPaywall(false)}
          onUnlocked={() => { setShowPaywall(false); if (yard) refreshPremium(yard.id) }}
        />
      ) : null}

      <Modal visible={showIdentify} animationType="slide" onRequestClose={() => setShowIdentify(false)}>
        <IdentifyPlantScreen
          yardId={yard.id}
          onCancel={() => setShowIdentify(false)}
          onConfirm={(result: PlantIdentificationResult, _photoUri: string) => {
            setShowIdentify(false)
            setPrefill({
              commonName: result.commonName || undefined,
              botanicalName: result.botanicalName || undefined,
            })
            setShowAddModal(true)
          }}
        />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#d6e8d0' },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f5f0' },
  hint:               { fontSize: 16, color: '#888' },
  placingBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#2d5a27', paddingHorizontal: 20, paddingVertical: 12,
  },
  placingText:        { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelText:         { color: '#a8d8a0', fontWeight: '600', fontSize: 14 },
  canvasArea:         { flex: 1, overflow: 'hidden' },
  unplacedBadge: {
    position: 'absolute', top: 56, right: 16,
    backgroundColor: '#f0a500', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  unplacedBadgeText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  legend: {
    position: 'absolute', bottom: 100, left: 12,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: 180,
  },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:          { width: 8, height: 8, borderRadius: 4 },
  legendLabel:        { fontSize: 11, color: '#333', fontWeight: '500' },
  fab: {
    position: 'absolute', bottom: 32, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2d5a27', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  fabText:            { color: '#fff', fontSize: 32, lineHeight: 36, fontWeight: '300' },
  plantCounter: {
    position: 'absolute', bottom: 44, right: 84,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  plantCounterText:   { color: '#fff', fontSize: 12, fontWeight: '600' },
  fabTextOpen:        { transform: [{ rotate: '45deg' }] },
  fabOverlay:         { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  fabMenu: {
    position: 'absolute', bottom: 100, right: 16, zIndex: 6,
    backgroundColor: '#fff', borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
    overflow: 'hidden',
  },
  fabMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  fabMenuIcon:        { fontSize: 20 },
  fabMenuLabel:       { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
})
