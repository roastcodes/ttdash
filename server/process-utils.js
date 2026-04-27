function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessRunning(pid, processObject = process) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    processObject.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function formatDateTime(value, locale = 'de-CH') {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

module.exports = {
  formatDateTime,
  isProcessRunning,
  sleep,
};
