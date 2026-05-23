// ─── Content Script ──────────────────────────────────────────────────

// Cache detected details
let currentJobDetails = null;

// CSS selectors for major platforms
const CONFIGS = [
  {
    host: 'linkedin.com',
    title: '.jobs-description__content, .t-24.job-details-jobs-unified-top-card__job-title, h1',
    company: '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name',
    desc: '.jobs-description__content, .jobs-box__html-content',
  },
  {
    host: 'indeed.com',
    title: 'h1.jobsearch-JobInfoHeader-title',
    company: '[data-company-name="true"], .jobsearch-CompanyInfoContainer',
    desc: '#jobDescriptionText',
  },
  {
    host: 'remotive.com',
    title: 'h1',
    company: '.company-name, .job-header h3',
    desc: '.job-description, #job-description',
  },
  {
    host: 'localhost',
    title: '.job-title, h1',
    company: '.company-name, .job-company',
    desc: '.job-description, #job-description',
  }
];

// Run auto-detector
detectJobDetails();

// Watch for DOM changes (SPA navigations)
const observer = new MutationObserver(() => {
  detectJobDetails();
});
observer.observe(document.body, { childList: true, subtree: true });

function detectJobDetails() {
  const url = window.location.href;
  const match = CONFIGS.find(cfg => url.includes(cfg.host));
  if (!match) return;

  try {
    const titleEl = document.querySelector(match.title);
    const companyEl = document.querySelector(match.company);
    const descEl = document.querySelector(match.desc);

    if (descEl && descEl.textContent.trim().length > 100) {
      const detected = {
        jobTitle: titleEl ? titleEl.textContent.replace(/\r?\n|\r/g, ' ').trim() : document.title,
        companyName: companyEl ? companyEl.textContent.replace(/\r?\n|\r/g, ' ').trim() : 'Company',
        jobDescription: descEl.textContent.trim(),
        jobUrl: url
      };

      // Deduplicate messages
      if (!currentJobDetails || currentJobDetails.jobDescription !== detected.jobDescription) {
        currentJobDetails = detected;
        chrome.runtime.sendMessage({ type: 'JOB_DETECTED', data: detected });
        injectFloatingButton();
      }
    }
  } catch (err) {
    console.error('Job details detection failed:', err);
  }
}

// Float button injection
function injectFloatingButton() {
  if (document.getElementById('jobagg-floating-button')) return;

  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'jobagg-floating-button';
  
  // Use Shadow DOM to protect extension styling from page CSS conflicts
  const shadow = buttonContainer.attachShadow({ mode: 'closed' });
  
  const style = document.createElement('style');
  style.textContent = `
    .floating-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 9999px;
      padding: 10px 18px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .floating-btn:hover {
      background: #6d28d9;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
    }
    .floating-btn:active {
      transform: translateY(0);
    }
    .btn-icon {
      width: 14px;
      height: 14px;
    }
  `;

  const button = document.createElement('button');
  button.className = 'floating-btn';
  button.innerHTML = `
    <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
    <span>Tailor CV with JobAgg</span>
  `;

  button.addEventListener('click', () => {
    // Open prompt alerting the user to open extension popup
    alert("Job detected! Click the JobAgg icon in your browser toolbar to tailor your CV for this job.");
  });

  shadow.appendChild(style);
  shadow.appendChild(button);
  document.body.appendChild(buttonContainer);
}

// Listen for background page messages (context menu helper)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SELECTION_METADATA') {
    const selection = window.getSelection().toString().trim();
    
    // Find page metadata
    let jobTitle = document.title;
    const h1 = document.querySelector('h1');
    if (h1) jobTitle = h1.textContent.trim();

    sendResponse({
      jobTitle,
      companyName: 'Selected Company',
      jobDescription: selection,
      jobUrl: window.location.href
    });
  }
  return true;
});
