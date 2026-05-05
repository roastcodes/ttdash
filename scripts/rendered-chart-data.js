const renderedChartDataSelector = [
  'path.recharts-line-curve',
  'path.recharts-area-area',
  'path.recharts-sector',
  '.recharts-bar-rectangle path',
  'path.recharts-rectangle',
].join(',');

async function countRenderedChartDataShapes(section) {
  return section.evaluate((element, selector) => {
    return Array.from(element.querySelectorAll(selector)).filter((node) => {
      const style = globalThis.getComputedStyle(node);
      const box = node.getBoundingClientRect();
      const totalLength = typeof node.getTotalLength === 'function' ? node.getTotalLength() : 0;

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || '1') > 0 &&
        (totalLength > 10 || (box.width > 2 && box.height > 2))
      );
    }).length;
  }, renderedChartDataSelector);
}

function isTimeoutError(error) {
  return (
    error instanceof Error && (error.name === 'TimeoutError' || /timeout/i.test(error.message))
  );
}

async function waitForRenderedChartData(
  page,
  {
    minShapes = 1,
    pollMs = 100,
    sectionSelector = '#charts',
    sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeoutMs = 10_000,
  } = {},
) {
  const section = page.locator(sectionSelector);
  const startedAt = Date.now();
  const timeoutError = () =>
    new Error(`Timed out waiting for rendered chart data in ${sectionSelector}`);
  const remainingTimeoutMs = () => Math.max(0, timeoutMs - (Date.now() - startedAt));

  try {
    await section.waitFor({ timeout: remainingTimeoutMs() });
  } catch (error) {
    if (remainingTimeoutMs() <= 0 && isTimeoutError(error)) {
      throw timeoutError();
    }

    throw error;
  }

  while (remainingTimeoutMs() > 0) {
    if ((await countRenderedChartDataShapes(section)) >= minShapes) {
      return;
    }

    const remainingBeforeSleepMs = remainingTimeoutMs();
    if (remainingBeforeSleepMs <= 0) {
      break;
    }

    await sleepImpl(Math.min(pollMs, remainingBeforeSleepMs));
  }

  throw timeoutError();
}

module.exports = {
  countRenderedChartDataShapes,
  renderedChartDataSelector,
  waitForRenderedChartData,
};
