import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
import type { DashboardSettingsModalViewModel } from '@/types/dashboard-view-model'
import { cn } from '@/lib/cn'
import {
  SettingsBackupsSection,
  SettingsDefaultsSection,
  SettingsLanguageSection,
  SettingsMotionSection,
  SettingsProviderLimitsSection,
  SettingsSectionsSection,
  SettingsStatusSection,
  SettingsToktrackVersionSection,
} from './SettingsModalSections'
import { useSettingsModalDraft } from './use-settings-modal-draft'
import { useSettingsModalVersionStatus } from './use-settings-modal-version-status'

type SettingsModalProps = DashboardSettingsModalViewModel

type SettingsModalTabId = 'basics' | 'layout' | 'limits' | 'maintenance'

const SETTINGS_MODAL_TABS: Array<{
  id: SettingsModalTabId
  labelKey: string
  descriptionKey: string
}> = [
  {
    id: 'basics',
    labelKey: 'settings.modal.tabs.basics.label',
    descriptionKey: 'settings.modal.tabs.basics.description',
  },
  {
    id: 'layout',
    labelKey: 'settings.modal.tabs.layout.label',
    descriptionKey: 'settings.modal.tabs.layout.description',
  },
  {
    id: 'limits',
    labelKey: 'settings.modal.tabs.limits.label',
    descriptionKey: 'settings.modal.tabs.limits.description',
  },
  {
    id: 'maintenance',
    labelKey: 'settings.modal.tabs.maintenance.label',
    descriptionKey: 'settings.modal.tabs.maintenance.description',
  },
]

function getSettingsTabPanelId(tabId: SettingsModalTabId) {
  return `settings-tab-panel-${tabId}`
}

function getSettingsTabButtonId(tabId: SettingsModalTabId) {
  return `settings-tab-${tabId}`
}

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
  const tabRefs = useRef<Record<SettingsModalTabId, HTMLButtonElement | null>>({
    basics: null,
    layout: null,
    limits: null,
    maintenance: null,
  })
  const [activeTab, setActiveTab] = useState<SettingsModalTabId>('basics')
  const draft = useSettingsModalDraft(props)
  const versionStatus = useSettingsModalVersionStatus()
  const activeTabDefinition =
    SETTINGS_MODAL_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_MODAL_TABS[0]!

  useEffect(() => {
    if (!open) {
      setActiveTab('basics')
    }
  }, [open])

  const focusTab = useCallback((tabId: SettingsModalTabId) => {
    setActiveTab(tabId)
    tabRefs.current[tabId]?.focus()
  }, [])

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, tabId: SettingsModalTabId) => {
      const currentIndex = SETTINGS_MODAL_TABS.findIndex((tab) => tab.id === tabId)
      if (currentIndex === -1) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const nextTab = SETTINGS_MODAL_TABS[(currentIndex + 1) % SETTINGS_MODAL_TABS.length]!
        focusTab(nextTab.id)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const nextTab =
          SETTINGS_MODAL_TABS[
            (currentIndex - 1 + SETTINGS_MODAL_TABS.length) % SETTINGS_MODAL_TABS.length
          ]!
        focusTab(nextTab.id)
      } else if (event.key === 'Home') {
        event.preventDefault()
        focusTab(SETTINGS_MODAL_TABS[0]!.id)
      } else if (event.key === 'End') {
        event.preventDefault()
        focusTab(SETTINGS_MODAL_TABS[SETTINGS_MODAL_TABS.length - 1]!.id)
      }
    },
    [focusTab],
  )

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

        <div className="rounded-2xl border border-border/50 bg-muted/15 p-2">
          <div
            role="tablist"
            aria-label={t('settings.modal.tabs.label')}
            className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          >
            {SETTINGS_MODAL_TABS.map((tab) => {
              const selected = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  ref={(element) => {
                    tabRefs.current[tab.id] = element
                  }}
                  type="button"
                  role="tab"
                  id={getSettingsTabButtonId(tab.id)}
                  aria-selected={selected}
                  aria-controls={getSettingsTabPanelId(tab.id)}
                  tabIndex={selected ? 0 : -1}
                  data-testid={`settings-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:outline-none',
                    selected
                      ? 'border-primary/40 bg-primary/12 text-foreground shadow-sm'
                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/45 hover:text-foreground',
                  )}
                >
                  <span className="block text-sm font-semibold">{t(tab.labelKey)}</span>
                  <span className="mt-1 block text-xs leading-relaxed">
                    {t(tab.descriptionKey)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          id={getSettingsTabPanelId(activeTab)}
          role="tabpanel"
          aria-labelledby={getSettingsTabButtonId(activeTab)}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
            <div className="text-sm font-medium text-foreground">
              {t(activeTabDefinition.labelKey)}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t(activeTabDefinition.descriptionKey)}
            </p>
          </div>

          {activeTab === 'basics' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <SettingsLanguageSection viewModel={draft.general} />
              <SettingsMotionSection viewModel={draft.general} />
              <div className="xl:col-span-2">
                <SettingsDefaultsSection viewModel={draft.defaults} settingsBusy={settingsBusy} />
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <SettingsSectionsSection viewModel={draft.sections} settingsBusy={settingsBusy} />
          )}

          {activeTab === 'limits' && (
            <SettingsProviderLimitsSection
              viewModel={draft.providerLimits}
              settingsBusy={settingsBusy}
            />
          )}

          {activeTab === 'maintenance' && (
            <>
              <SettingsStatusSection
                lastLoadedAt={lastLoadedAt ?? null}
                lastLoadSource={lastLoadSource ?? null}
                cliAutoLoadActive={cliAutoLoadActive}
              />
              <SettingsBackupsSection
                hasData={hasData}
                settingsBusy={settingsBusy}
                dataBusy={dataBusy}
                onExportSettings={onExportSettings}
                onImportSettings={onImportSettings}
                onExportData={onExportData}
                onImportData={onImportData}
              />
              <SettingsToktrackVersionSection versionStatus={versionStatus} />
            </>
          )}
        </div>

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
