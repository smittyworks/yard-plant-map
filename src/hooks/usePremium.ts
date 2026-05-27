import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FREE_TIER_PLANT_LIMIT } from '../constants'

export function usePremium(yardId: string | null) {
  const [isPremium, setIsPremium] = useState(false)
  const [plantCount, setPlantCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!yardId) return
    load(yardId)
  }, [yardId])

  async function load(yardId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: userData }, { count }] = await Promise.all([
      supabase.from('users').select('is_premium').eq('id', user.id).single(),
      supabase.from('plants').select('*', { count: 'exact', head: true }).eq('yard_id', yardId),
    ])

    setIsPremium(userData?.is_premium ?? false)
    setPlantCount(count ?? 0)
    setLoading(false)
  }

  function refresh(yardId: string) { load(yardId) }

  const atLimit = !isPremium && plantCount >= FREE_TIER_PLANT_LIMIT

  return { isPremium, plantCount, atLimit, loading, refresh }
}
