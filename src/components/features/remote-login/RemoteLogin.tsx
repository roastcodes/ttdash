import { useState, type FormEvent } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { authenticateRemoteSession } from '@/lib/api'

interface RemoteLoginProps {
  onAuthenticated?: () => void
}

/** Prompts remote browser users for the configured server token. */
export function RemoteLogin({
  onAuthenticated = () => window.location.reload(),
}: RemoteLoginProps) {
  const { t } = useTranslation()
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token.trim() || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await authenticateRemoteSession(token)
      setToken('')
      setSubmitting(false)
      onAuthenticated()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t('remoteLogin.failed'))
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md space-y-6 p-8 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t('remoteLogin.title')}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('remoteLogin.description')}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="remote-token" className="text-sm font-medium">
              {t('remoteLogin.tokenLabel')}
            </label>
            <input
              id="remote-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="current-password"
              aria-describedby={error ? 'remote-token-error' : undefined}
              required
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {error ? (
            <p id="remote-token-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full gap-2" disabled={!token.trim() || submitting}>
            {submitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {submitting ? t('remoteLogin.signingIn') : t('remoteLogin.submit')}
          </Button>
        </form>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('remoteLogin.securityNote')}
        </p>
      </Card>
    </main>
  )
}
