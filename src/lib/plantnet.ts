import { PlantIdentificationResult } from '../types'
import { PLANTNET_API_BASE } from '../constants'

const API_KEY = process.env.EXPO_PUBLIC_PLANTNET_API_KEY

export async function identifyPlant(photoUri: string): Promise<PlantIdentificationResult[]> {
  if (!API_KEY) throw new Error('PlantNet API key not configured')

  const formData = new FormData()
  formData.append('images', { uri: photoUri, type: 'image/jpeg', name: 'plant.jpg' } as any)
  formData.append('organs', 'auto')

  const data = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${PLANTNET_API_BASE}/identify/all?api-key=${API_KEY}&nb-results=5&lang=en`)
    xhr.responseType = 'json'
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
      else reject(new Error(`PlantNet API error: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })

  return (data.results ?? []).map((result: any) => ({
    botanicalName: result.species?.scientificNameWithoutAuthor ?? 'Unknown',
    commonName: result.species?.commonNames?.[0] ?? result.species?.scientificNameWithoutAuthor ?? 'Unknown',
    confidence: result.score ?? 0,
    imageUrl: result.images?.[0]?.url?.m,
  }))
}
