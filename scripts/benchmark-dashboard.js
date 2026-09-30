const { performance } = require('node:perf_hooks');
const path = require('node:path');
const currentDomain = require('../shared/dashboard-domain');

function createDataset(days) {
  const models = [
    'gpt-5.4',
    'gpt-5',
    'claude-sonnet-4-6',
    'claude-opus-4-6',
    'claude-haiku-4-5',
    'gemini-3-flash-preview',
    'claude-sonnet-4-5',
    'claude-opus-4-5',
    'gpt-5-mini',
    'o3',
    'grok-4',
    'llama-4',
    'qwen-3',
    'deepseek-v3',
    'mistral-large',
  ];
  return Array.from({ length: days }, (_, index) => {
    const modelBreakdowns = models.map((modelName, model) => ({
      modelName,
      inputTokens: 1000,
      outputTokens: 500,
      cacheCreationTokens: 200,
      cacheReadTokens: 5000,
      thinkingTokens: 100,
      cost: (model + 1) * 0.01,
      requestCount: 10,
      requestCountStatus: 'known',
    }));
    return {
      date: new Date(Date.UTC(2016, 0, index + 1)).toISOString().slice(0, 10),
      inputTokens: 15000,
      outputTokens: 7500,
      cacheCreationTokens: 3000,
      cacheReadTokens: 75000,
      thinkingTokens: 1500,
      totalTokens: 102000,
      totalCost: 1.2,
      requestCount: 150,
      requestCountStatus: 'known',
      modelsUsed: models,
      modelBreakdowns,
    };
  });
}

function measure(domain, data) {
  const pipeline = () => {
    domain.computeMetrics(data);
    domain.aggregateToDailyFormat(data, 'monthly');
    domain.filterByModels(data, ['GPT-5.4', 'Claude Sonnet 4.6']);
  };
  for (let iteration = 0; iteration < 10; iteration += 1) pipeline();
  const times = Array.from({ length: 30 }, () => {
    const start = performance.now();
    pipeline();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return { medianMs: Number(times[15].toFixed(2)), p95Ms: Number(times[28].toFixed(2)) };
}

const baselineArgument = process.argv.find((argument) => argument.startsWith('--baseline='));
const baseline = baselineArgument
  ? require(path.resolve(baselineArgument.slice('--baseline='.length)))
  : null;
let passed = true;
for (const days of [365, 3650]) {
  const data = createDataset(days);
  const before = baseline ? measure(baseline, data) : null;
  const after = measure(currentDomain, data);
  const regression = before ? after.p95Ms / before.p95Ms - 1 : null;
  const withinBudget = after.p95Ms <= 100 && (regression === null || regression <= 0.1);
  passed &&= withinBudget;
  console.log(
    JSON.stringify({
      days,
      models: 15,
      samples: 30,
      warmup: 10,
      before,
      after,
      regression,
      withinBudget,
    }),
  );
}
if (!passed) process.exitCode = 1;
