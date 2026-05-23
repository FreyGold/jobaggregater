// ─── Service Worker ──────────────────────────────────────────────────

// Register context menu items synchronously on startup/install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tailor-cv-context',
    title: 'Tailor CV for this job',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'tailor-cv-context' && tab && tab.id) {
    try {
      // Send a message to the active tab's content script to grab selection details
      chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION_METADATA' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          // Fallback: just store whatever selection text was captured in info
          storeJobData({
            jobTitle: tab.title || 'Selected Job',
            companyName: 'Company',
            jobDescription: info.selectionText || '',
            jobUrl: tab.url || ''
          });
          return;
        }

        if (response) {
          storeJobData({
            jobTitle: response.jobTitle || tab.title || 'Selected Job',
            companyName: response.companyName || 'Company',
            jobDescription: response.jobDescription || info.selectionText || '',
            jobUrl: response.jobUrl || tab.url || ''
          });
        }
      });
    } catch (err) {
      console.error('Error handling context menu:', err);
    }
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JOB_DETECTED') {
    storeJobData(message.data);
    sendResponse({ success: true });
  }
  return true;
});

// Helper to store job data in session storage
function storeJobData(data) {
  chrome.storage.session.set({ job_data: data }, () => {
    console.log('Saved job data to session storage:', data);
  });
}
