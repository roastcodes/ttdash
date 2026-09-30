import { useTranslation } from 'react-i18next'
import type { UsageQualityIssue } from '@/types'

interface DataQualityNoticeProps {
  issues?: UsageQualityIssue[]
  dataThrough?: string
  requestCoverage?: number
  unreadableFiles?: number
}

/** Makes excluded legacy rows, source freshness, and partial request coverage visible. */
export function DataQualityNotice({
  issues = [],
  dataThrough,
  requestCoverage = 0,
  unreadableFiles = 0,
}: DataQualityNoticeProps) {
  const { t } = useTranslation()
  return (
    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
      {dataThrough && (
        <p>
          {t('dataQuality.dataThrough', { date: dataThrough })} ·{' '}
          {t('requestQuality.coverage', { value: `${requestCoverage.toFixed(1)}%` })}
        </p>
      )}
      {unreadableFiles > 0 && (
        <p role="status">{t('dataQuality.unreadableFiles', { count: unreadableFiles })}</p>
      )}
      {issues.length > 0 && (
        <details className="rounded-lg border border-amber-500/30 p-3">
          <summary className="cursor-pointer">
            {t('dataQuality.excludedRows', { count: issues.length })}
          </summary>
          <p className="my-2">{t('dataQuality.persistedFileUnchanged')}</p>
          <ul className="space-y-1">
            {issues.slice(0, 50).map((issue, index) => (
              <li key={index}>
                {issue.system ? `${issue.system} · ` : ''}
                {issue.date} · {issue.field} · {issue.code}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
