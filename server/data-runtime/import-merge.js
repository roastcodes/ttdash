const COST_COMPARISON_TOLERANCE = 1e-9;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function areNumbersEquivalent(left, right, tolerance = COST_COMPARISON_TOLERANCE) {
  return Math.abs(left - right) <= tolerance;
}

function hasValidUsageDayDate(day) {
  return typeof day?.date === 'string' && day.date.trim().length > 0;
}

function sortStrings(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function canonicalizeModelBreakdown(entry) {
  return {
    modelName: typeof entry?.modelName === 'string' ? entry.modelName.trim() : '',
    inputTokens: Number(entry?.inputTokens) || 0,
    outputTokens: Number(entry?.outputTokens) || 0,
    cacheCreationTokens: Number(entry?.cacheCreationTokens) || 0,
    cacheReadTokens: Number(entry?.cacheReadTokens) || 0,
    thinkingTokens: Number(entry?.thinkingTokens) || 0,
    cost: Number(entry?.cost) || 0,
    requestCount: Number(entry?.requestCount) || 0,
  };
}

function canonicalizeUsageDay(day) {
  return {
    date: typeof day?.date === 'string' ? day.date : '',
    inputTokens: Number(day?.inputTokens) || 0,
    outputTokens: Number(day?.outputTokens) || 0,
    cacheCreationTokens: Number(day?.cacheCreationTokens) || 0,
    cacheReadTokens: Number(day?.cacheReadTokens) || 0,
    thinkingTokens: Number(day?.thinkingTokens) || 0,
    totalTokens: Number(day?.totalTokens) || 0,
    totalCost: Number(day?.totalCost) || 0,
    requestCount: Number(day?.requestCount) || 0,
    modelsUsed: sortStrings(day?.modelsUsed),
    modelBreakdowns: (Array.isArray(day?.modelBreakdowns) ? day.modelBreakdowns : [])
      .map(canonicalizeModelBreakdown)
      .sort((left, right) => left.modelName.localeCompare(right.modelName)),
  };
}

function areUsageDaysEquivalent(left, right) {
  const leftDay = canonicalizeUsageDay(left);
  const rightDay = canonicalizeUsageDay(right);
  const scalarFields = [
    'date',
    'inputTokens',
    'outputTokens',
    'cacheCreationTokens',
    'cacheReadTokens',
    'thinkingTokens',
    'totalTokens',
    'totalCost',
    'requestCount',
  ];

  for (const field of scalarFields) {
    if (field === 'totalCost') {
      if (!areNumbersEquivalent(leftDay[field], rightDay[field])) {
        return false;
      }
      continue;
    }

    if (leftDay[field] !== rightDay[field]) {
      return false;
    }
  }

  if (leftDay.modelsUsed.length !== rightDay.modelsUsed.length) {
    return false;
  }
  for (let index = 0; index < leftDay.modelsUsed.length; index += 1) {
    if (leftDay.modelsUsed[index] !== rightDay.modelsUsed[index]) {
      return false;
    }
  }

  if (leftDay.modelBreakdowns.length !== rightDay.modelBreakdowns.length) {
    return false;
  }

  const breakdownFields = [
    'modelName',
    'inputTokens',
    'outputTokens',
    'cacheCreationTokens',
    'cacheReadTokens',
    'thinkingTokens',
    'cost',
    'requestCount',
  ];
  for (let index = 0; index < leftDay.modelBreakdowns.length; index += 1) {
    const leftBreakdown = leftDay.modelBreakdowns[index];
    const rightBreakdown = rightDay.modelBreakdowns[index];
    for (const field of breakdownFields) {
      if (field === 'cost') {
        if (!areNumbersEquivalent(leftBreakdown[field], rightBreakdown[field])) {
          return false;
        }
        continue;
      }

      if (leftBreakdown[field] !== rightBreakdown[field]) {
        return false;
      }
    }
  }

  return true;
}

function computeUsageTotals(daily) {
  return daily.reduce(
    (totals, day) => ({
      inputTokens: totals.inputTokens + (day.inputTokens || 0),
      outputTokens: totals.outputTokens + (day.outputTokens || 0),
      cacheCreationTokens: totals.cacheCreationTokens + (day.cacheCreationTokens || 0),
      cacheReadTokens: totals.cacheReadTokens + (day.cacheReadTokens || 0),
      thinkingTokens: totals.thinkingTokens + (day.thinkingTokens || 0),
      totalCost: totals.totalCost + (day.totalCost || 0),
      totalTokens: totals.totalTokens + (day.totalTokens || 0),
      requestCount: totals.requestCount + (day.requestCount || 0),
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalCost: 0,
      totalTokens: 0,
      requestCount: 0,
    },
  );
}

/** Creates import payload extraction and usage merge helpers. */
function createDataRuntimeImportMerge({
  normalizeIncomingData,
  settingsBackupKind,
  usageBackupKind,
}) {
  function extractSettingsImportPayload(payload) {
    if (!isPlainObject(payload)) {
      throw new Error('Uploaded JSON is not a settings backup file.');
    }

    if (payload.kind === settingsBackupKind) {
      if (!Object.prototype.hasOwnProperty.call(payload, 'settings')) {
        throw new Error('The settings backup file does not contain any settings.');
      }
      if (!isPlainObject(payload.settings)) {
        throw new Error('The settings backup file has an invalid settings payload.');
      }
      return payload.settings;
    }

    if (typeof payload.kind === 'string' && payload.kind === usageBackupKind) {
      throw new Error('This is a data backup file, not a settings file.');
    }

    throw new Error('Uploaded JSON is not a settings backup file.');
  }

  /**
   * Extracts usage data from backup files while keeping legacy raw imports working.
   * Non-object payloads are returned verbatim for backwards compatibility with raw arrays
   * or pre-validated data. Object payloads with usageBackupKind must contain data,
   * while settingsBackupKind objects are rejected as the wrong backup type.
   */
  function extractUsageImportPayload(payload) {
    if (!isPlainObject(payload)) {
      return payload;
    }

    if (payload.kind === usageBackupKind) {
      if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
        throw new Error('The usage backup file does not contain any usage data.');
      }
      return payload.data;
    }

    if (typeof payload.kind === 'string' && payload.kind === settingsBackupKind) {
      throw new Error('This is a settings backup file, not a data file.');
    }

    return payload;
  }

  function mergeUsageData(currentData, importedData) {
    if (!importedData || !Array.isArray(importedData.daily)) {
      throw new Error('Imported data must contain a daily array.');
    }

    const validImportedDaily = importedData.daily.filter(hasValidUsageDayDate);
    const skippedDays = importedData.daily.length - validImportedDaily.length;
    const current =
      currentData && Array.isArray(currentData.daily) && currentData.daily.length > 0
        ? normalizeIncomingData(currentData)
        : null;

    if (!current) {
      const data =
        skippedDays > 0
          ? {
              daily: validImportedDaily,
              totals: computeUsageTotals(validImportedDaily),
            }
          : importedData;

      return {
        data,
        summary: {
          importedDays: importedData.daily.length,
          addedDays: validImportedDaily.length,
          unchangedDays: 0,
          conflictingDays: 0,
          skippedDays,
          totalDays: validImportedDaily.length,
        },
      };
    }

    const currentByDate = new Map(current.daily.map((day) => [day.date, day]));
    let addedDays = 0;
    let unchangedDays = 0;
    let conflictingDays = 0;

    for (const importedDay of validImportedDaily) {
      const existingDay = currentByDate.get(importedDay.date);
      if (!existingDay) {
        currentByDate.set(importedDay.date, importedDay);
        addedDays += 1;
        continue;
      }

      if (areUsageDaysEquivalent(existingDay, importedDay)) {
        unchangedDays += 1;
        continue;
      }

      // Preserve local data on conflicts and report the day so users can resolve it explicitly.
      conflictingDays += 1;
    }

    const mergedDaily = [...currentByDate.values()].sort((left, right) =>
      left.date.localeCompare(right.date),
    );

    return {
      data: {
        daily: mergedDaily,
        totals: computeUsageTotals(mergedDaily),
      },
      summary: {
        importedDays: importedData.daily.length,
        addedDays,
        unchangedDays,
        conflictingDays,
        skippedDays,
        totalDays: mergedDaily.length,
      },
    };
  }

  return {
    extractSettingsImportPayload,
    extractUsageImportPayload,
    mergeUsageData,
  };
}

module.exports = {
  createDataRuntimeImportMerge,
};
