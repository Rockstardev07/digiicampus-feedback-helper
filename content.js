// DigiiCampus Feedback Helper - Content Script
(function () {
  if (window.__dgFeedbackHelperInjected) return;
  window.__dgFeedbackHelperInjected = true;

  // Helper delay
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Helper to find the specific form Submit button (ng-click="saveResponse(true)") and NEVER "Submit Session"
  function getFormSubmitButton() {
    // 1. Direct selector on saveResponse
    const directBtn = document.querySelector('button[ng-click*="saveResponse"]');
    if (directBtn && !directBtn.disabled && !directBtn.classList.contains('disabled')) {
      return directBtn;
    }

    // 2. Search buttons with exact text 'Submit' while strictly ignoring 'Submit Session'
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a, md-button'));
    const matched = buttons.find(el => {
      const txt = el.textContent.trim();
      const ngClick = el.getAttribute('ng-click') || '';

      // STRICTLY REJECT any button related to 'Submit Session'
      if (txt.toLowerCase().includes('session') || ngClick.includes('submitSession')) {
        return false;
      }

      const isExactSubmit = txt.toLowerCase() === 'submit';
      const isSaveResponse = ngClick.includes('saveResponse');

      return (isExactSubmit || isSaveResponse) && !el.disabled && !el.classList.contains('disabled');
    });

    return matched || directBtn;
  }

  // Helper to fill all single select questions and textareas in current visible section
  async function fillCurrentSectionQuestions(savedSectionQuestions, secNum) {
    const qDivs = document.querySelectorAll('[ng-repeat*="selectedTemplateSection.questions"]');
    if (qDivs.length === 0) return 0;

    for (let qIdx = 0; qIdx < qDivs.length; qIdx++) {
      const qDiv = qDivs[qIdx];
      const options = Array.from(qDiv.querySelectorAll('[ng-show="question.type==\'SINGLE_SELECT\'"]'));

      if (options.length > 0) {
        const targetIdx = (savedSectionQuestions && savedSectionQuestions[qIdx] && savedSectionQuestions[qIdx].checkedIdx !== -1)
          ? savedSectionQuestions[qIdx].checkedIdx
          : 0; // Default to Excellent

        const targetOpt = options[targetIdx] || options[0];
        // Only click if not already selected
        if (targetOpt && !targetOpt.querySelector('.feedback-radio-selected')) {
          targetOpt.click();
          // Increased delay (90ms) so AngularJS digest cycle reliably registers every radio button click
          await delay(90);
        }
      }

      // Textarea / Subjective
      const textarea = qDiv.querySelector('textarea');
      if (textarea && savedSectionQuestions && savedSectionQuestions[qIdx]?.text) {
        if (textarea.value !== savedSectionQuestions[qIdx].text) {
          textarea.value = savedSectionQuestions[qIdx].text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          await delay(60);
        }
      }
    }

    // Verification & Retry pass: ensure EVERY single-select question visibly has .feedback-radio-selected
    await delay(250);
    for (let qIdx = 0; qIdx < qDivs.length; qIdx++) {
      const qDiv = qDivs[qIdx];
      const options = Array.from(qDiv.querySelectorAll('[ng-show="question.type==\'SINGLE_SELECT\'"]'));
      if (options.length > 0 && !qDiv.querySelector('.feedback-radio-selected')) {
        const targetIdx = (savedSectionQuestions && savedSectionQuestions[qIdx] && savedSectionQuestions[qIdx].checkedIdx !== -1)
          ? savedSectionQuestions[qIdx].checkedIdx
          : 0;
        const fallbackOpt = options[targetIdx] || options[0];
        if (fallbackOpt) {
          fallbackOpt.click();
          await delay(120);
        }
      }
    }

    return qDivs.length;
  }

  // 1. COPY ALL SECTIONS
  async function copyAllSections(updateLog) {
    const tabs = Array.from(document.querySelectorAll('.curriculum-spec-header'));
    if (tabs.length === 0) {
      throw new Error("No section tabs found. Open a feedback form first!");
    }

    const allSectionsData = [];

    for (let s = 0; s < tabs.length; s++) {
      if (updateLog) updateLog(`Opening Section ${s + 1} of ${tabs.length}...`, 'running');
      tabs[s].click();
      await delay(700); // 700ms delay to let Section questions render completely

      const qDivs = document.querySelectorAll('[ng-repeat*="selectedTemplateSection.questions"]');
      const sectionQuestions = Array.from(qDivs).map(qDiv => {
        const options = Array.from(qDiv.querySelectorAll('[ng-show="question.type==\'SINGLE_SELECT\'"]'));
        let checkedIdx = options.findIndex(opt => opt.querySelector('.feedback-radio-selected') !== null);
        if (checkedIdx === -1 && options.length > 0) checkedIdx = 0;
        const text = qDiv.querySelector('textarea')?.value || '';
        return { checkedIdx, text };
      });

      allSectionsData.push(sectionQuestions);
    }

    localStorage.setItem('copiedFeedbackSections', JSON.stringify(allSectionsData));
    if (chrome && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ copiedFeedbackSections: allSectionsData });
    }

    const totalQuestions = allSectionsData.reduce((acc, sec) => acc + sec.length, 0);
    return { sectionsCount: allSectionsData.length, totalQuestions };
  }

  // 2. FILL ALL SECTIONS & SUBMIT (TARGETS saveResponse(true))
  async function fillAllSectionsAndSubmit(updateLog) {
    const tabs = Array.from(document.querySelectorAll('.curriculum-spec-header'));
    if (tabs.length === 0) {
      throw new Error("No section tabs found. Open Common TA form first!");
    }

    let savedData = null;
    if (chrome && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get('copiedFeedbackSections');
      savedData = res.copiedFeedbackSections;
    }
    if (!savedData || !savedData.length) {
      savedData = JSON.parse(localStorage.getItem('copiedFeedbackSections') || '[]');
    }

    // Step A: Fill Section 1
    if (updateLog) updateLog("Opening Section 1...", 'running');
    tabs[0].click();
    await delay(700);

    if (updateLog) updateLog("Filling Section 1 questions...", 'running');
    await fillCurrentSectionQuestions(savedData[0] || [], 1);
    await delay(500);

    // Step B: Fill Section 2 (and any additional sections)
    for (let s = 1; s < tabs.length; s++) {
      if (updateLog) updateLog(`Opening Section ${s + 1} of ${tabs.length}...`, 'running');
      tabs[s].click();
      await delay(700);

      if (updateLog) updateLog(`Filling Section ${s + 1} questions...`, 'running');
      await fillCurrentSectionQuestions(savedData[s] || [], s + 1);
      await delay(500);
    }

    // Step C: Verify both sections have green ticks
    if (updateLog) updateLog("Verifying all questions in both sections...", 'running');
    await delay(600);

    const currentTabs = Array.from(document.querySelectorAll('.curriculum-spec-header'));
    for (let s = 0; s < currentTabs.length; s++) {
      if (!currentTabs[s].querySelector('.classroom-tick-img')) {
        if (updateLog) updateLog(`Re-checking Section ${s + 1} for missed questions...`, 'running');
        currentTabs[s].click();
        await delay(700);
        await fillCurrentSectionQuestions(savedData[s] || [], s + 1);
        await delay(500);
      }
    }

    // Check if any mandatory question on screen is still unselected
    const unanswered = Array.from(document.querySelectorAll('[ng-repeat*="selectedTemplateSection.questions"]'))
      .filter(qDiv => {
        const opts = qDiv.querySelectorAll('[ng-show="question.type==\'SINGLE_SELECT\'"]');
        return opts.length > 0 && !qDiv.querySelector('.feedback-radio-selected');
      });

    if (unanswered.length > 0) {
      throw new Error(`Cannot submit: ${unanswered.length} question(s) in Section 2 are still unanswered.`);
    }

    // Step D: EXTRA DELAY AFTER SECTION 2 BEFORE SUBMITTING (Let validation settle)
    if (updateLog) updateLog("Both sections complete! Waiting 1.5s for validation to settle...", 'running');
    await delay(1600); // 1.6 second pause to ensure Angular fully validates both sections

    // Step E: Trigger the Form Submit button (saveResponse(true), NOT submitSession)
    if (updateLog) updateLog("Submitting form (saveResponse)...", 'running');
    await delay(400);

    const submitBtn = getFormSubmitButton();

    if (submitBtn) {
      submitBtn.click();
      await delay(600);

      // Handle confirmation modal if any (confirming submission, NOT submitSession)
      const confirmBtn = Array.from(document.querySelectorAll('.modal button, md-dialog button, .bootbox button, [role="dialog"] button, [role="dialog"] [role="button"]'))
        .find(el => {
          const txt = el.textContent.trim().toLowerCase();
          const ngClick = el.getAttribute('ng-click') || '';
          if (txt.includes('session') || ngClick.includes('submitSession')) return false;
          return txt === 'yes' || txt === 'confirm' || txt === 'ok' || txt === 'submit';
        });

      if (confirmBtn) {
        confirmBtn.click();
      }

      return true;
    } else {
      throw new Error("Both sections filled, but could not find the form Submit button (saveResponse). Please click Submit manually.");
    }
  }

  // 3. FILL ALL EXCELLENT & SUBMIT (TARGETS saveResponse(true))
  async function fillAllExcellentAndSubmit(updateLog) {
    const tabs = Array.from(document.querySelectorAll('.curriculum-spec-header'));
    if (tabs.length === 0) {
      throw new Error("No section tabs found. Open feedback form first!");
    }

    for (let s = 0; s < tabs.length; s++) {
      if (updateLog) updateLog(`Opening Section ${s + 1} of ${tabs.length}...`, 'running');
      tabs[s].click();
      await delay(700);

      if (updateLog) updateLog(`Setting Section ${s + 1} to Excellent...`, 'running');
      const qDivs = document.querySelectorAll('[ng-repeat*="selectedTemplateSection.questions"]');
      for (let qIdx = 0; qIdx < qDivs.length; qIdx++) {
        const options = qDivs[qIdx].querySelectorAll('[ng-show="question.type==\'SINGLE_SELECT\'"]');
        if (options.length > 0 && !options[0].querySelector('.feedback-radio-selected')) {
          options[0].click();
          await delay(90); // 90ms delay per radio button
        }
      }
      await delay(400);
    }

    // Verify ticks on all tabs
    if (updateLog) updateLog("Verifying both sections are complete...", 'running');
    await delay(600);

    const currentTabs = Array.from(document.querySelectorAll('.curriculum-spec-header'));
    for (let s = 0; s < currentTabs.length; s++) {
      if (!currentTabs[s].querySelector('.classroom-tick-img')) {
        currentTabs[s].click();
        await delay(700);
        const qDivs = document.querySelectorAll('[ng-repeat*="selectedTemplateSection.questions"]');
        for (let qIdx = 0; qIdx < qDivs.length; qIdx++) {
          const options = qDivs[qIdx].querySelectorAll('[ng-show="question.type==\'SINGLE_SELECT\'"]');
          if (options.length > 0) {
            options[0].click();
            await delay(90);
          }
        }
        await delay(400);
      }
    }

    // Solid pause after Section 2 before submit
    if (updateLog) updateLog("Both sections complete! Waiting 1.5s before submit...", 'running');
    await delay(1600);

    const submitBtn = getFormSubmitButton();

    if (submitBtn) {
      submitBtn.click();
      await delay(600);

      const confirmBtn = Array.from(document.querySelectorAll('.modal button, md-dialog button, .bootbox button, [role="dialog"] button, [role="dialog"] [role="button"]'))
        .find(el => {
          const txt = el.textContent.trim().toLowerCase();
          const ngClick = el.getAttribute('ng-click') || '';
          if (txt.includes('session') || ngClick.includes('submitSession')) return false;
          return txt === 'yes' || txt === 'confirm' || txt === 'ok' || txt === 'submit';
        });

      if (confirmBtn) {
        confirmBtn.click();
      }

      return true;
    }
    return false;
  }

  // Create UI Floating Widget on Page
  function createWidget() {
    if (document.getElementById('dg-feedback-helper-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'dg-feedback-helper-widget';

    widget.innerHTML = `
      <div class="dg-header" id="dg-header">
        <div class="dg-title">
          <span>📋</span> Feedback Helper
        </div>
        <button class="dg-min-btn" id="dg-toggle-btn" title="Minimize / Expand">−</button>
      </div>
      <div class="dg-body" id="dg-body">
        <div class="dg-status-badge" id="dg-badge">
          <span>⚪</span> No feedback copied yet
        </div>
        <button class="dg-btn dg-btn-primary" id="dg-btn-copy">
          <span>📋</span> Step 1: Copy All Sections
        </button>
        <button class="dg-btn dg-btn-success" id="dg-btn-paste">
          <span>⚡</span> Step 2: Fill Both Sections & Submit
        </button>
        <button class="dg-btn dg-btn-outline" id="dg-btn-excellent">
          <span>⭐</span> Quick Fill All Excellent & Submit
        </button>
        <div class="dg-log" id="dg-log">Ready</div>
      </div>
    `;

    document.body.appendChild(widget);

    const toggleBtn = widget.querySelector('#dg-toggle-btn');
    const header = widget.querySelector('#dg-header');
    const badge = widget.querySelector('#dg-badge');
    const log = widget.querySelector('#dg-log');
    const btnCopy = widget.querySelector('#dg-btn-copy');
    const btnPaste = widget.querySelector('#dg-btn-paste');
    const btnExcellent = widget.querySelector('#dg-btn-excellent');

    // Toggle minimize
    const toggleMin = () => {
      widget.classList.toggle('dg-minimized');
      toggleBtn.textContent = widget.classList.contains('dg-minimized') ? '+' : '−';
    };
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMin();
    });
    header.addEventListener('dblclick', toggleMin);

    const setLog = (msg, type = '') => {
      log.textContent = msg;
      log.className = 'dg-log ' + type;
    };

    const updateBadgeStatus = () => {
      const raw = localStorage.getItem('copiedFeedbackSections');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data && data.length) {
            const totalQ = data.reduce((a, b) => a + b.length, 0);
            badge.className = 'dg-status-badge has-data';
            badge.innerHTML = `<span>🟢</span> Copied: ${data.length} Sections (${totalQ} Qs)`;
            return;
          }
        } catch (e) {}
      }
      badge.className = 'dg-status-badge';
      badge.innerHTML = `<span>⚪</span> No feedback copied yet`;
    };

    updateBadgeStatus();

    // Copy Button Handler
    btnCopy.addEventListener('click', async () => {
      btnCopy.disabled = true;
      try {
        const res = await copyAllSections(setLog);
        setLog(` Copied all ${res.sectionsCount} sections (${res.totalQuestions} Qs)!`, 'success');
        updateBadgeStatus();
      } catch (err) {
        setLog(`❌ ${err.message}`, 'error');
      } finally {
        btnCopy.disabled = false;
      }
    });

    // Paste & Submit Button Handler
    btnPaste.addEventListener('click', async () => {
      btnPaste.disabled = true;
      try {
        const submitted = await fillAllSectionsAndSubmit(setLog);
        if (submitted) {
          setLog(' Form submitted successfully!', 'success');
        } else {
          setLog(' Both sections filled! Click Submit.', 'success');
        }
      } catch (err) {
        setLog(`❌ ${err.message}`, 'error');
      } finally {
        btnPaste.disabled = false;
      }
    });

    // Excellent Button Handler
    btnExcellent.addEventListener('click', async () => {
      btnExcellent.disabled = true;
      try {
        const submitted = await fillAllExcellentAndSubmit(setLog);
        if (submitted) {
          setLog(' Form submitted successfully!', 'success');
        } else {
          setLog(' Filled! Click Submit.', 'success');
        }
      } catch (err) {
        setLog(`❌ ${err.message}`, 'error');
      } finally {
        btnExcellent.disabled = false;
      }
    });
  }

  // Listen for popup messages
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'copy') {
        copyAllSections()
          .then(res => sendResponse({ success: true, ...res }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      } else if (request.action === 'paste') {
        fillAllSectionsAndSubmit()
          .then(submitted => sendResponse({ success: true, submitted }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      } else if (request.action === 'fill_excellent') {
        fillAllExcellentAndSubmit()
          .then(submitted => sendResponse({ success: true, submitted }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }
    });
  }

  // Inject UI when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

  // Re-check periodically in case SPA reloads inner router
  setInterval(() => {
    if (!document.getElementById('dg-feedback-helper-widget')) {
      createWidget();
    }
  }, 2000);
})();
