import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InfoHeading } from '@/components/ui/info-heading'
import { FEATURE_HELP } from '@/lib/help-content'
import type { DashboardSettingsModalViewModel } from '@/lib/dashboard-view-model'
import {
  SettingsBackupsSection,
  SettingsDashboardSection,
  SettingsDefaultsSection,
  SettingsLanguageSection,
  SettingsProviderLimitsSection,
  SettingsSectionsSection,
  SettingsStatusSection,
} from './SettingsModalSections'
import { useSettingsModalDraft } from './use-settings-modal-draft'
import { useSettingsModalVersionStatus } from './use-settings-modal-version-status'

type SettingsModalProps = DashboardSettingsModalViewModel

/** Renders the settings dialog for dashboard preferences and imports. */
export function SettingsModal(props: SettingsModalProps) {
  const {
    open,
    onOpenChange,
    lastLoadedAt,
    lastLoadSource,
    cliAutoLoadActive = false,
    hasData,
    onExportSettings,
    onImportSettings,
    onExportData,
    onImportData,
    settingsBusy = false,
    dataBusy = false,
  } = props
  const { t } = useTranslation()
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const draft = useSettingsModalDraft(props)
  const versionStatus = useSettingsModalVersionStatus(open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[88vh] max-w-5xl overflow-x-visible overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          titleRef.current?.focus()
        }}
      >
        <DialogHeader className="overflow-visible">
          <InfoHeading info={FEATURE_HELP.providerLimits}>
            <DialogTitle ref={titleRef} tabIndex={-1} className="focus:outline-none">
              {t('settings.modal.title')}
            </DialogTitle>
          </InfoHeading>
          <DialogDescription>{t('settings.modal.description')}</DialogDescription>
        </DialogHeader>

        <SettingsStatusSection
          lastLoadedAt={lastLoadedAt ?? null}
          lastLoadSource={lastLoadSource ?? null}
          cliAutoLoadActive={cliAutoLoadActive}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <SettingsLanguageSection viewModel={draft.general} />
          <SettingsDefaultsSection viewModel={draft.defaults} settingsBusy={settingsBusy} />
          <SettingsSectionsSection viewModel={draft.sections} settingsBusy={settingsBusy} />
          <SettingsDashboardSection viewModel={draft.general} versionStatus={versionStatus} />
        </div>

        <SettingsBackupsSection
          hasData={hasData}
          settingsBusy={settingsBusy}
          dataBusy={dataBusy}
          onExportSettings={onExportSettings}
          onImportSettings={onImportSettings}
          onExportData={onExportData}
          onImportData={onImportData}
        />

        <SettingsProviderLimitsSection
          viewModel={draft.providerLimits}
          settingsBusy={settingsBusy}
        />

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            onClick={draft.footer.onResetAll}
            disabled={settingsBusy}
            data-testid="reset-all-settings-drafts"
          >
            {t('common.reset')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={draft.footer.onClose} disabled={settingsBusy}>
              {t('settings.modal.close')}
            </Button>
            <Button onClick={() => void draft.footer.onSave()} disabled={settingsBusy}>
              {t('settings.modal.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
