import type { UsageData } from '@/types'

export async function fetchUsage(): Promise<UsageData> {
  const res = await fetch('/api/usage')
  if (!res.ok) throw new Error('Fehler beim Laden der Daten')
  return res.json()
}

export async function uploadData(data: unknown): Promise<{ days: number; totalCost: number }> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload fehlgeschlagen' }))
    throw new Error(err.message)
  }
  return res.json()
}

export async function deleteUsage(): Promise<void> {
  const res = await fetch('/api/usage', { method: 'DELETE' })
  if (!res.ok) throw new Error('Löschen fehlgeschlagen')
}
