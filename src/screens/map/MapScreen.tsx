import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler'
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg'
import { useNavigation, useRoute } from '@react-navigation/native'
import { supabase } from '../../lib/supabase'
import { Plant, PlantIdentificationResult, PlantType, Yard, YardFeature, FeatureType, FEATURE_COLORS } from '../../types'
import { FREE_TIER_PLANT_LIMIT } from '../../constants'
import AddPlantModal from '../plants/AddPlantModal'
import AddFeatureModal from './AddFeatureModal'
import IdentifyPlantScreen from '../plants/IdentifyPlantScreen'
import PaywallScreen from '../paywall/PaywallScreen'
import { usePremium } from '../../hooks/usePremium'

const CELL_PX = 60

const PLANT_ICONS: Record<PlantType, string> = {
  tree:         '🌳',
  shrub:        '🌿',
  perennial:    '🌸',
  annual:       '🌼',
  vine:         '🍃',
  grass:        '🌾',
  bulb:         '🌷',
  other:        '🪴',
}

// Keep colors for the legend dots
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
  const route = useRoute<any>()

  const [yard, setYard] = useState<Yard | null>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [features, setFeatures] = useState<YardFeature[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddFeature, setShowAddFeature] = useState(false)
  const [showIdentify, setShowIdentify] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [fabExpanded, setFabExpanded] = useState(false)
  const [prefill, setPrefill] = useState<{ commonName?: string; botanicalName?: string } | undefined>()
  const [placingPlantId, setPlacingPlantId] = useState<string | null>(null)
  // Feature placement: two-tap mode (corner1 → corner2)
  const [pendingFeature, setPendingFeature] = useState<{ type: FeatureType; label: string } | null>(null)
  const [featureCorner1, setFeatureCorner1] = useState<{ x: number; y: number } | null>(null)

  const { atLimit, isPremium, plantCount, refresh: refreshPremium } = usePremium(yard?.id ?? null)

  // Gesture handler refs for simultaneousHandlers
  const panRef = useRef(null)
  const pinchRef = useRef(null)

  // Pan
  const translateX = useRef(new Animated.Value(20)).current
  const translateY = useRef(new Animated.Value(20)).current
  const panOffsetRef = useRef({ x: 20, y: 20 })

  // Scale: totalScale = baseScale * pinchScale
  // baseScale accumulates across gestures; pinchScale tracks the live gesture (starts at 1)
  const baseScale  = useRef(new Animated.Value(1)).current
  const pinchScale = useRef(new Animated.Value(1)).current
  const totalScale = Animated.multiply(baseScale, pinchScale)
  const currentScaleRef = useRef(1)

  // Canvas area position for coordinate conversion
  const canvasAreaRef = useRef<any>(null)
  const canvasAreaPagePos = useRef({ x: 0, y: 0 })
  const touchStartRef = useRef({ screenX: 0, screenY: 0 })

  // Keep refs in sync for use inside gesture callbacks
  const placingPlantIdRef  = useRef<string | null>(null)
  const plantsRef          = useRef<Plant[]>([])
  const featuresRef        = useRef<YardFeature[]>([])
  const yardRef            = useRef<Yard | null>(null)
  const pendingFeatureRef  = useRef<{ type: FeatureType; label: string } | null>(null)
  const featureCorner1Ref  = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => { placingPlantIdRef.current = placingPlantId }, [placingPlantId])
  useEffect(() => { plantsRef.current = plants }, [plants])
  useEffect(() => { featuresRef.current = features }, [features])
  useEffect(() => { yardRef.current = yard }, [yard])
  useEffect(() => { pendingFeatureRef.current = pendingFeature }, [pendingFeature])
  useEffect(() => { featureCorner1Ref.current = featureCorner1 }, [featureCorner1])

  function onCanvasAreaLayout() {
    canvasAreaRef.current?.measureInWindow((x, y) => {
      canvasAreaPagePos.current = { x, y }
    })
  }

  // Pan gesture
  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false },
  )

  function onPanStateChange(e: any) {
    const { state, translationX: tx, translationY: ty, absoluteX, absoluteY } = e.nativeEvent
    if (state === State.BEGAN) {
      translateX.setOffset(panOffsetRef.current.x)
      translateY.setOffset(panOffsetRef.current.y)
      translateX.setValue(0)
      translateY.setValue(0)
      touchStartRef.current = { screenX: absoluteX, screenY: absoluteY }
    }
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      panOffsetRef.current = {
        x: panOffsetRef.current.x + tx,
        y: panOffsetRef.current.y + ty,
      }
      translateX.flattenOffset()
      translateY.flattenOffset()

      if (Math.abs(tx) < 8 && Math.abs(ty) < 8) {
        // Tap: convert screen → canvas coordinates accounting for translate + scale
        const currentYard = yardRef.current
        if (!currentYard) return
        const sx = touchStartRef.current.screenX - canvasAreaPagePos.current.x
        const sy = touchStartRef.current.screenY - canvasAreaPagePos.current.y
        const s  = currentScaleRef.current
        const cw = currentYard.grid_width  * CELL_PX
        const ch = currentYard.grid_height * CELL_PX
        // RN scales around element center, so:
        // screen = translate + center + (local - center) * scale
        // local  = (screen - translate - center) / scale + center
        const canvasX = (sx - panOffsetRef.current.x - cw / 2) / s + cw / 2
        const canvasY = (sy - panOffsetRef.current.y - ch / 2) / s + ch / 2
        handleCanvasTap(canvasX, canvasY)
      }
    }
  }

  // Pinch gesture
  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: false },
  )

  function onPinchStateChange(e: any) {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const next = Math.max(0.4, Math.min(3, currentScaleRef.current * e.nativeEvent.scale))
      currentScaleRef.current = next
      baseScale.setValue(next)
      pinchScale.setValue(1)
    }
  }

  function handleCanvasTap(canvasX: number, canvasY: number) {
    const currentYard = yardRef.current
    if (!currentYard) return

    const gx = Math.floor(canvasX / CELL_PX)
    const gy = Math.floor(canvasY / CELL_PX)
    const inBounds = gx >= 0 && gx < currentYard.grid_width && gy >= 0 && gy < currentYard.grid_height

    // Plant placement mode
    const pId = placingPlantIdRef.current
    if (pId) {
      if (inBounds) placePlant(pId, gx, gy)
      return
    }

    // Feature placement mode — two taps
    if (pendingFeatureRef.current) {
      if (!inBounds) return
      if (!featureCorner1Ref.current) {
        // First tap: set anchor corner
        setFeatureCorner1({ x: gx, y: gy })
        featureCorner1Ref.current = { x: gx, y: gy }
      } else {
        // Second tap: save feature
        const c1 = featureCorner1Ref.current
        const x = Math.min(c1.x, gx)
        const y = Math.min(c1.y, gy)
        const w = Math.abs(gx - c1.x) + 1
        const h = Math.abs(gy - c1.y) + 1
        saveFeature(pendingFeatureRef.current, x, y, w, h)
      }
      return
    }

    // Normal mode: check feature tap first (features are larger targets)
    const tappedFeature = featuresRef.current.find(f =>
      gx >= f.grid_x && gx < f.grid_x + f.grid_width &&
      gy >= f.grid_y && gy < f.grid_y + f.grid_height
    )
    if (tappedFeature) {
      Alert.alert(tappedFeature.label, 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => deleteFeature(tappedFeature.id),
        },
      ])
      return
    }

    // Tap a plant marker to view detail
    const tapped = plantsRef.current.find(p => {
      if (!p.placed || p.grid_x == null || p.grid_y == null) return false
      const mx = p.grid_x * CELL_PX + CELL_PX / 2
      const my = p.grid_y * CELL_PX + CELL_PX / 2
      return Math.sqrt((canvasX - mx) ** 2 + (canvasY - my) ** 2) <= CELL_PX * 0.4
    })
    if (tapped) navigation.navigate('PlantDetail', { plantId: tapped.id })
  }

  async function deleteFeature(featureId: string) {
    const { error } = await supabase.from('yard_features').delete().eq('id', featureId)
    if (error) { Alert.alert('Error', error.message); return }
    setFeatures(prev => prev.filter(f => f.id !== featureId))
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

  async function saveFeature(
    pending: { type: FeatureType; label: string },
    x: number, y: number, w: number, h: number,
  ) {
    const currentYard = yardRef.current
    if (!currentYard) return
    const { data, error } = await supabase
      .from('yard_features')
      .insert({
        yard_id:      currentYard.id,
        label:        pending.label,
        feature_type: pending.type,
        grid_x:       x,
        grid_y:       y,
        grid_width:   w,
        grid_height:  h,
        color:        FEATURE_COLORS[pending.type],
      })
      .select()
      .single()
    if (error) { Alert.alert('Error', error.message) }
    else setFeatures(prev => [...prev, data])
    setPendingFeature(null)
    setFeatureCorner1(null)
  }

  useEffect(() => { loadData() }, [])

  // Enter placement mode when navigated here with a placePlantId param
  useEffect(() => {
    const plantId = route.params?.placePlantId
    if (plantId) {
      setPlacingPlantId(plantId)
      // Clear the param so re-focusing doesn't re-trigger
      navigation.setParams({ placePlantId: undefined })
    }
  }, [route.params?.placePlantId])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: yardData } = await supabase
        .from('yards').select('*').eq('user_id', user.id).maybeSingle()
      if (!yardData) return

      setYard(yardData)
      const [{ data: plantsData }, { data: featuresData }] = await Promise.all([
        supabase.from('plants').select('*').eq('yard_id', yardData.id).order('created_at'),
        supabase.from('yard_features').select('*').eq('yard_id', yardData.id),
      ])
      setPlants(plantsData ?? [])
      setFeatures(featuresData ?? [])
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

  function handleFabAction(action: 'identify' | 'manual' | 'feature') {
    setFabExpanded(false)
    if (action === 'feature') { setShowAddFeature(true); return }
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
      ) : pendingFeature ? (
        <View style={styles.placingBanner}>
          <Text style={styles.placingText}>
            {featureCorner1 ? 'Tap bottom-right corner' : 'Tap top-left corner'}
          </Text>
          <Pressable onPress={() => { setPendingFeature(null); setFeatureCorner1(null) }} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <PinchGestureHandler
        ref={pinchRef}
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={onPinchStateChange}
        simultaneousHandlers={panRef}
      >
        <Animated.View style={styles.canvasArea}>
          <PanGestureHandler
            ref={panRef}
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanStateChange}
            simultaneousHandlers={pinchRef}
            minPointers={1}
            maxPointers={2}
          >
            <Animated.View
              ref={canvasAreaRef}
              style={styles.canvasArea}
              onLayout={onCanvasAreaLayout}
            >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: [
              { translateX },
              { translateY },
              { scale: totalScale },
            ],
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

            {/* Yard features */}
            {features.map(f => (
              <React.Fragment key={f.id}>
                <Rect
                  x={f.grid_x * CELL_PX + 2}
                  y={f.grid_y * CELL_PX + 2}
                  width={f.grid_width * CELL_PX - 4}
                  height={f.grid_height * CELL_PX - 4}
                  fill={f.color}
                  fillOpacity={0.7}
                  rx={6}
                />
                <SvgText
                  x={f.grid_x * CELL_PX + (f.grid_width * CELL_PX) / 2}
                  y={f.grid_y * CELL_PX + (f.grid_height * CELL_PX) / 2 + 5}
                  fontSize={Math.min(14, f.grid_width * CELL_PX / (f.label.length * 0.7 + 1))}
                  fontWeight="700"
                  fill="#fff"
                  textAnchor="middle"
                >
                  {f.label}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Highlight anchor corner during feature placement */}
            {featureCorner1 ? (
              <Rect
                x={featureCorner1.x * CELL_PX + 2}
                y={featureCorner1.y * CELL_PX + 2}
                width={CELL_PX - 4}
                height={CELL_PX - 4}
                fill="#2d5a27"
                fillOpacity={0.5}
                rx={4}
              />
            ) : null}

            {/* Front / Back orientation labels */}
            <SvgText
              x={canvasWidth / 2} y={canvasHeight - 8}
              fontSize={13} fontWeight="600" fill="#4a7c40"
              textAnchor="middle"
            >
              ▲ Front
            </SvgText>
            <SvgText
              x={canvasWidth / 2} y={20}
              fontSize={13} fontWeight="600" fill="#4a7c40"
              textAnchor="middle"
            >
              Back ▼
            </SvgText>

            {/* Plant markers */}
            {plants
              .filter(p => p.placed && p.grid_x != null && p.grid_y != null)
              .map(p => (
                <SvgText
                  key={p.id}
                  x={p.grid_x! * CELL_PX + CELL_PX / 2}
                  y={p.grid_y! * CELL_PX + CELL_PX / 2 + 9}
                  fontSize={CELL_PX * 0.55}
                  textAnchor="middle"
                >
                  {PLANT_ICONS[p.plant_type]}
                </SvgText>
              ))
            }

          </Svg>
        </Animated.View>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>

      {unplacedCount > 0 ? (
        <Pressable
          style={styles.unplacedBadge}
          onPress={() => navigation.navigate('UnplacedPlants')}
        >
          <Text style={styles.unplacedBadgeText}>{unplacedCount} unplaced</Text>
        </Pressable>
      ) : null}

      {/* Legend */}
      {plants.some(p => p.placed) ? (
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
      ) : null}

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
            <Pressable
              style={[styles.fabMenuItem, { borderTopWidth: 1, borderTopColor: '#f0f0f0' }]}
              onPress={() => handleFabAction('feature')}
            >
              <Text style={styles.fabMenuIcon}>🪨</Text>
              <Text style={styles.fabMenuLabel}>Add Feature</Text>
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

      {showAddFeature ? (
        <AddFeatureModal
          onClose={() => setShowAddFeature(false)}
          onConfirm={(type, label) => {
            setShowAddFeature(false)
            setPendingFeature({ type, label })
            setFeatureCorner1(null)
          }}
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
  fab: {
    position: 'absolute', bottom: 32, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2d5a27', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopWidth: 1, borderTopColor: '#dde8d8',
  },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:          { width: 9, height: 9, borderRadius: 5 },
  legendLabel:        { fontSize: 12, color: '#444', fontWeight: '500', textTransform: 'capitalize' },
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
