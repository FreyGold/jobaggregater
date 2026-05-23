// ─── Popup Controller ───────────────────────────────────────────────

const GROQ_MODELS = ['mixtral-8x7b-32768', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'];

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements - Sections
  const loginSection = document.getElementById('login-section');
  const mainSection = document.getElementById('main-section');
  const resultSection = document.getElementById('result-section');
  
  // DOM Elements - Login
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');
  const authStatus = document.getElementById('auth-status');
  
  // DOM Elements - Main Form
  const resumeSelect = document.getElementById('resume-select');
  const uploadZone = document.getElementById('upload-zone');
  const resumeFileInput = document.getElementById('resume-file');
  const uploadStatus = document.getElementById('upload-status');
  const jobTitleInput = document.getElementById('job-title');
  const jobCompanyInput = document.getElementById('job-company');
  const jobDescInput = document.getElementById('job-desc');
  const tailorBtn = document.getElementById('tailor-btn');
  const aiExtractBtn = document.getElementById('ai-extract-btn');
  
  // DOM Elements - Result View
  const scoreBadge = document.getElementById('score-badge');
  const tailoredPreview = document.getElementById('tailored-content-preview');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-preview-btn');

  // DOM Elements - Settings
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const aiProviderSelect = document.getElementById('ai-provider');
  const aiModelSelect = document.getElementById('ai-model');
  const aiApiKeyInput = document.getElementById('ai-api-key');
  const saveToBackendCheckbox = document.getElementById('save-to-backend');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  // DOM Elements - Global Msg
  const globalMessage = document.getElementById('global-message');

  let activeUser = null;

  // Initialize
  await checkAuth();
  await loadSettings();

  // ─── Provider/Model selectors ─────────────────────────────────────
  function populateModels(provider) {
    const models = provider === 'groq' ? GROQ_MODELS : GEMINI_MODELS;
    aiModelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
  }

  aiProviderSelect.addEventListener('change', () => {
    populateModels(aiProviderSelect.value);
  });

  // ─── Settings Toggle ──────────────────────────────────────────────
  settingsToggleBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  // ─── Load / Save Settings ─────────────────────────────────────────
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['ai_settings'], (res) => {
        const s = res.ai_settings || {};
        if (s.provider) aiProviderSelect.value = s.provider;
        populateModels(aiProviderSelect.value);
        if (s.model) aiModelSelect.value = s.model;
        if (s.apiKey) aiApiKeyInput.value = s.apiKey;
        saveToBackendCheckbox.checked = s.saveToBackend || false;
        resolve();
      });
    });
  }

  function saveSettingsLocally(settings) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ ai_settings: settings }, resolve);
    });
  }

  saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
      provider: aiProviderSelect.value,
      model: aiModelSelect.value,
      apiKey: aiApiKeyInput.value.trim(),
      saveToBackend: saveToBackendCheckbox.checked,
    };

    await saveSettingsLocally(settings);

    if (settings.saveToBackend && settings.apiKey) {
      const token = await getToken();
      if (token) {
        const res = await apiRequest('/api/settings/ai', {
          method: 'PUT',
          body: {
            provider: settings.provider,
            model: settings.model,
            apiKey: settings.apiKey,
          },
        });
        if (res.error) {
          showMessage('Saved locally, but failed to save to backend: ' + res.error, 'error');
          return;
        }
      } else {
        showMessage('Not logged in — API key saved locally only.', 'error');
        return;
      }
    }

    showMessage('Settings saved!', 'success');
  });

  // ─── Auth ─────────────────────────────────────────────────────────
  async function checkAuth() {
    const token = await getToken();
    if (token) {
      chrome.storage.local.get(['user_info'], async (res) => {
        activeUser = res.user_info || { name: 'User' };
        renderAuthenticatedState();
        await loadResumes();
        await loadDetectedJob();
      });
    } else {
      renderLoggedOutState();
    }
  }

  function renderAuthenticatedState() {
    loginSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    
    authStatus.innerHTML = `
      <span>Hi, <strong>${activeUser.name || 'User'}</strong></span>
      <button id="logout-btn" class="btn-logout">Logout</button>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
  }

  function renderLoggedOutState() {
    loginSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    authStatus.textContent = '';
    activeUser = null;
  }

  async function handleLogout() {
    await clearToken();
    renderLoggedOutState();
    showMessage('Logged out successfully', 'success');
  }

  // ─── Resumes ──────────────────────────────────────────────────────
  async function loadResumes() {
    const response = await apiRequest('/api/resumes');
    if (response.error) {
      if (response.error === 'UNAUTHORIZED') {
        renderLoggedOutState();
      } else {
        showMessage(response.error, 'error');
      }
      return;
    }

    const resumes = response.data || [];
    resumeSelect.innerHTML = '<option value="">-- Choose a saved CV --</option>';
    
    resumes.forEach((resume) => {
      const option = document.createElement('option');
      option.value = resume.id;
      option.textContent = `${resume.fileName} (${new Date(resume.createdAt).toLocaleDateString()})`;
      resumeSelect.appendChild(option);
    });
  }

  // ─── Job Detection ───────────────────────────────────────────────
  async function loadDetectedJob() {
    chrome.storage.session.get(['job_data'], (res) => {
      if (res.job_data) {
        const data = res.job_data;
        if (data.jobTitle) jobTitleInput.value = data.jobTitle;
        if (data.companyName) jobCompanyInput.value = data.companyName;
        if (data.jobDescription) jobDescInput.value = data.jobDescription;
      }
    });
  }

  // ─── AI Extract from Page ─────────────────────────────────────────
  aiExtractBtn.addEventListener('click', async () => {
    const settings = await new Promise(resolve => {
      chrome.storage.local.get(['ai_settings'], (res) => resolve(res.ai_settings || {}));
    });

    if (!settings.apiKey) {
      showMessage('Please configure an AI API key in Settings first.', 'error');
      settingsPanel.classList.remove('hidden');
      return;
    }

    setLoading(aiExtractBtn, true, 'Extracting...');
    hideMessage();

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab || !tab.id) {
        showMessage('No active tab found.', 'error');
        setLoading(aiExtractBtn, false);
        return;
      }

      const pageData = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_TEXT' });
      if (!pageData || !pageData.bodyText) {
        showMessage('Could not extract text from this page.', 'error');
        setLoading(aiExtractBtn, false);
        return;
      }

      const prompt = `You are a job listing parser. Given the following page text, extract the job title and company name. If you can find a job description, include it. Return ONLY valid JSON with these fields: "jobTitle", "companyName", "jobDescription". If you cannot determine a field, use an empty string.

Page URL: ${pageData.url}
Page Title: ${pageData.title}

Page Text:
${pageData.bodyText.slice(0, 15000)}`;

      let result;
      if (settings.provider === 'groq') {
        result = await callGroq(settings.apiKey, settings.model || 'mixtral-8x7b-32768', prompt);
      } else {
        result = await callGemini(settings.apiKey, settings.model || 'gemini-2.0-flash', prompt);
      }

      const parsed = JSON.parse(result);
      if (parsed.jobTitle) jobTitleInput.value = parsed.jobTitle;
      if (parsed.companyName) jobCompanyInput.value = parsed.companyName;
      if (parsed.jobDescription) jobDescInput.value = parsed.jobDescription;

      showMessage('Job details extracted!', 'success');
    } catch (err) {
      console.error('AI Extract error:', err);
      showMessage('AI extraction failed: ' + (err.message || err), 'error');
    }

    setLoading(aiExtractBtn, false);
  });

  // ─── Login ────────────────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(loginBtn, true, 'Logging In...');
    hideMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    setLoading(loginBtn, false);

    if (response.error) {
      showMessage(response.error, 'error');
      return;
    }

    const token = response.data?.token;
    const user = response.data?.user;

    if (token) {
      await setToken(token);
      chrome.storage.local.set({ user_info: user }, () => {
        activeUser = user;
        renderAuthenticatedState();
        loadResumes();
        loadDetectedJob();
        showMessage('Welcome back!', 'success');
      });
    } else {
      showMessage('Auth response was missing credentials.', 'error');
    }
  });

  // ─── File Uploads ─────────────────────────────────────────────────
  uploadZone.addEventListener('click', () => {
    resumeFileInput.click();
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--primary)';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = 'var(--card-border)';
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--card-border)';
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  resumeFileInput.addEventListener('change', () => {
    if (resumeFileInput.files.length > 0) {
      handleFileUpload(resumeFileInput.files[0]);
    }
  });

  async function handleFileUpload(file) {
    if (!['application/pdf', 'text/markdown', 'text/x-markdown'].includes(file.type) && !file.name.endsWith('.md')) {
      showUploadStatus('Invalid format. PDF or Markdown only.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showUploadStatus('File size exceeds 5MB limit.', 'error');
      return;
    }

    showUploadStatus('Uploading file...', 'info');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiRequest('/api/resumes/upload', {
      method: 'POST',
      body: formData
    });

    if (response.error) {
      showUploadStatus(`Upload failed: ${response.error}`, 'error');
      return;
    }

    showUploadStatus('Upload successful!', 'success');
    await loadResumes();
    
    if (response.data && response.data.id) {
      resumeSelect.value = response.data.id;
    }
  }

  function showUploadStatus(msg, type) {
    uploadStatus.textContent = msg;
    uploadStatus.className = 'status-msg';
    if (type === 'error') uploadStatus.style.color = 'var(--error)';
    else if (type === 'success') uploadStatus.style.color = 'var(--success)';
    else uploadStatus.style.color = 'var(--text-muted)';
  }

  // ─── Tailoring Action ─────────────────────────────────────────────
  tailorBtn.addEventListener('click', async () => {
    const resumeId = resumeSelect.value;
    const jobTitle = jobTitleInput.value.trim();
    const companyName = jobCompanyInput.value.trim();
    const jobDescription = jobDescInput.value.trim();

    if (!resumeId) {
      showMessage('Please choose or upload a CV first.', 'error');
      return;
    }
    if (!jobTitle) {
      showMessage('Please provide a job title.', 'error');
      return;
    }
    if (!companyName) {
      showMessage('Please provide a company name.', 'error');
      return;
    }
    if (!jobDescription) {
      showMessage('Please provide a job description.', 'error');
      return;
    }

    hideMessage();
    setLoading(tailorBtn, true, 'Tailoring with Gemini...');

    let jobUrl = '';
    const stored = await new Promise(resolve => chrome.storage.session.get(['job_data'], resolve));
    if (stored.job_data && stored.job_data.jobDescription === jobDescription) {
      jobUrl = stored.job_data.jobUrl || '';
    }

    const response = await apiRequest(`/api/resumes/${resumeId}/tailor`, {
      method: 'POST',
      body: {
        jobTitle,
        companyName,
        jobDescription,
        jobUrl
      }
    });

    setLoading(tailorBtn, false);

    if (response.error) {
      showMessage(response.error, 'error');
      return;
    }

    renderResultView(response.data);
  });

  function renderResultView(tailoredData) {
    mainSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    const score = tailoredData.score || 0;
    scoreBadge.textContent = `${score}%`;
    scoreBadge.className = 'badge';
    
    if (score < 50) scoreBadge.classList.add('score-low');
    else if (score <= 75) scoreBadge.classList.add('score-medium');
    else scoreBadge.classList.add('score-high');

    tailoredPreview.textContent = tailoredData.tailoredContent || '';
  }

  // ─── Reset & Copy ─────────────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    showUploadStatus('', '');
  });

  copyBtn.addEventListener('click', async () => {
    const text = tailoredPreview.textContent;
    try {
      await navigator.clipboard.writeText(text);
      const span = copyBtn.querySelector('span');
      span.textContent = 'Copied!';
      setTimeout(() => {
        span.textContent = 'Copy';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  });

  // ─── Helpers ──────────────────────────────────────────────────────
  function setLoading(btn, isLoading, loadingText = 'Loading...') {
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span> <span>${loadingText}</span>`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
      }
    }
  }

  function showMessage(msg, type) {
    globalMessage.textContent = msg;
    globalMessage.className = `global-message msg-${type}`;
    globalMessage.classList.remove('hidden');
  }

  function hideMessage() {
    globalMessage.classList.add('hidden');
  }
});
