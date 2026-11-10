document.addEventListener('DOMContentLoaded', async () => {
  const badge = document.getElementById('popup-badge');
  const log = document.getElementById('popup-log');
  const btnCopy = document.getElementById('btn-copy');
  const btnPaste = document.getElementById('btn-paste');
  const btnExcellent = document.getElementById('btn-excellent');

  const setLog = (msg, type = '') => {
    log.textContent = msg;
    log.className = 'log ' + type;
  };

  const updateBadge = () => {
    chrome.storage.local.get('copiedFeedbackSections', (res) => {
      const data = res.copiedFeedbackSections;
      if (data && data.length) {
        const totalQ = data.reduce((a, b) => a + b.length, 0);
        badge.className = 'badge has-data';
        badge.innerHTML = `<span>🟢</span> Copied: ${data.length} Secs (${totalQ} Qs)`;
      } else {
        badge.className = 'badge';
        badge.innerHTML = `<span>⚪</span> No feedback copied yet`;
      }
    });
  };

  updateBadge();

  const sendToActiveTab = (action) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          return reject(new Error('No active tab found.'));
        }
        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve(response);
        });
      });
    });
  };

  btnCopy.addEventListener('click', async () => {
    btnCopy.disabled = true;
    setLog('Copying both sections...', 'running');
    try {
      const res = await sendToActiveTab('copy');
      if (res && res.success) {
        setLog(` Copied ${res.sectionsCount} sections (${res.totalQuestions} Qs)!`, 'success');
        updateBadge();
      } else {
        setLog(`❌ ${res?.error || 'Failed to copy'}`, 'error');
      }
    } catch (err) {
      setLog(`❌ ${err.message}`, 'error');
    } finally {
      btnCopy.disabled = false;
    }
  });

  btnPaste.addEventListener('click', async () => {
    btnPaste.disabled = true;
    setLog('Filling both sections...', 'running');
    try {
      const res = await sendToActiveTab('paste');
      if (res && res.success) {
        setLog(res.submitted ? ' Both sections filled & submitted!' : ' Filled! Click Submit.', 'success');
      } else {
        setLog(`❌ ${res?.error || 'Failed to paste'}`, 'error');
      }
    } catch (err) {
      setLog(`❌ ${err.message}`, 'error');
    } finally {
      btnPaste.disabled = false;
    }
  });

  btnExcellent.addEventListener('click', async () => {
    btnExcellent.disabled = true;
    setLog('Setting all sections to Excellent...', 'running');
    try {
      const res = await sendToActiveTab('fill_excellent');
      if (res && res.success) {
        setLog(res.submitted ? ' Both sections filled & submitted!' : ' Filled! Click Submit.', 'success');
      } else {
        setLog(`❌ ${res?.error || 'Failed to fill'}`, 'error');
      }
    } catch (err) {
      setLog(`❌ ${err.message}`, 'error');
    } finally {
      btnExcellent.disabled = false;
    }
  });
});
