export type PlantType = 'tree' | 'shrub' | 'perennial' | 'annual' | 'vine' | 'grass' | 'bulb' | 'other'

export type FeatureType = 'patio' | 'pool' | 'deck' | 'driveway' | 'shed' | 'garden_bed' | 'walkway' | 'other'

export interface YardFeature {
  id: string
  yard_id: string
  label: string
  feature_type: FeatureType
  grid_x: number
  grid_y: number
  grid_width: number
  grid_height: number
  color: string
  created_at: string
}

export const FEATURE_COLORS: Record<FeatureType, string> = {
  patio:      '#c8b89a',
  pool:       '#7ec8e3',
  deck:       '#c4965a',
  driveway:   '#a8a8a8',
  shed:       '#8b7355',
  garden_bed: '#7a5c2e',
  walkway:    '#b8ad96',
  other:      '#b0b0b0',
}

export const FEATURE_ICONS: Record<FeatureType, string> = {
  patio:      '🪨',
  pool:       '🏊',
  deck:       '🪵',
  driveway:   '🚗',
  shed:       '🏚',
  garden_bed: '🌱',
  walkway:    '👣',
  other:      '⬜',
}

export type CareEventType = 'pruning' | 'fertilizing' | 'watering' | 'treatment' | 'transplanting' | 'other'

export interface User {
  id: string
  email: string
  hardiness_zone: string | null
  created_at: string
}

export interface Yard {
  id: string
  user_id: string
  name: string
  grid_width: number
  grid_height: number
  created_at: string
}

export interface Plant {
  id: string
  yard_id: string
  common_name: string
  botanical_name: string | null
  plant_type: PlantType
  grid_x: number | null
  grid_y: number | null
  placed: boolean
  date_planted: string | null
  notes: string | null
  created_at: string
  // joined
  photos?: PlantPhoto[]
  reminders?: Reminder[]
}

export interface PlantPhoto {
  id: string
  plant_id: string
  storage_url: string
  taken_at: string
  notes: string | null
}

export interface CareEvent {
  id: string
  plant_id: string
  event_type: CareEventType
  occurred_at: string
  notes: string | null
}

export interface Reminder {
  id: string
  plant_id: string
  reminder_type: CareEventType
  due_date: string
  completed_at: string | null
}

// Yard size presets
export type YardSizePreset = 'S' | 'M' | 'L' | 'XL'

export const YARD_SIZE_PRESETS: Record<YardSizePreset, { width: number; height: number; label: string }> = {
  S:  { width: 10, height: 8,  label: 'Small (~800 sq ft)' },
  M:  { width: 16, height: 12, label: 'Medium (~2,000 sq ft)' },
  L:  { width: 24, height: 18, label: 'Large (~5,000 sq ft)' },
  XL: { width: 32, height: 24, label: 'XL (~8,000 sq ft)' },
}

// AI identification result from PlantNet
export interface PlantIdentificationResult {
  commonName: string
  botanicalName: string
  confidence: number // 0–1
  imageUrl?: string
}
