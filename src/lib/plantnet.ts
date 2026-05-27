import { PlantIdentificationResult } from '../types'
import { PLANTNET_API_BASE } from '../constants'

const API_KEY = process.env.EXPO_PUBLIC_PLANTNET_API_KEY

/**
 * Submit a photo to PlantNet for identification.
 * Returns a list of matches sorted by confidence descending.
 */
export async function identifyPlant(photoUri: string): Promise<PlantIdentificationResult[]> {
  if (!API_KEY) throw new Error('PlantNet API key not configured')

  const formData = new FormData()
  formData.append('images', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'plant.jpg',
  } as any)
  formData.append('organs', 'auto')

  const response = await fetch(
    `${PLANTNET_API_BASE}/identify/all?api-key=${API_KEY}&nb-results=5&lang=en`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    throw new Error(`PlantNet API error: ${response.status}`)
  }

  const data = await response.json()

  return (data.results ?? []).map((result: any) => ({
    botanicalName: result.species?.scientificNameWithoutAuthor ?? 'Unknown',
    commonName: result.species?.commonNames?.[0] ?? result.species?.scientificNameWithoutAuthor ?? 'Unknown',
    confidence: result.score ?? 0,
    imageUrl: result.images?.[0]?.url?.m,
  }))
}
