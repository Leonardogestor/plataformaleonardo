"use client"

import { useState, useEffect } from "react"

interface AnamnesisProfile {
  birthDate: string | null
  riskLevel: string | null
  profileType: string | null
}

interface UseAnamnesisResult {
  profile: AnamnesisProfile | null
  isLoading: boolean
}

export function useAnamnesis(): UseAnamnesisResult {
  const [profile, setProfile] = useState<AnamnesisProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch("/api/user/anamnesis")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.exists && data?.anamnesis) {
          setProfile({
            birthDate: data.anamnesis.birthDate ?? null,
            riskLevel: data.anamnesis.riskLevel ?? null,
            profileType: data.anamnesis.profileType ?? null,
          })
        } else {
          setProfile(null)
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { profile, isLoading }
}
