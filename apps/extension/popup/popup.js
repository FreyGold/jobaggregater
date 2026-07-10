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

  // DOM Elements - Global Msg
  const globalMessage = document.getElementById('global-message');

  let activeUser = null;

  // ─── Auth ──────────────────────────────────────────────────────────
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

  // ─── Form Persistence ──────────────────────────────────────────────
  function saveFormFields() {
    const data = {
      title: jobTitleInput.value,
      company: jobCompanyInput.value,
      description: jobDescInput.value,
    };
    chrome.storage.local.set({ form_fields: data });
  }

  function loadFormFields() {
    chrome.storage.local.get(['form_fields'], (res) => {
      if (res.form_fields) {
        if (res.form_fields.title) jobTitleInput.value = res.form_fields.title;
        if (res.form_fields.company) jobCompanyInput.value = res.form_fields.company;
        if (res.form_fields.description) jobDescInput.value = res.form_fields.description;
      }
    });
  }

  jobTitleInput.addEventListener('input', saveFormFields);
  jobCompanyInput.addEventListener('input', saveFormFields);
  jobDescInput.addEventListener('input', saveFormFields);

  // DOM Elements - API Env Switcher
  const apiEnvSelect = document.getElementById('api-env-select');

  // Initialize API Environment Select
  chrome.storage.local.get(['api_env'], (res) => {
    if (apiEnvSelect) {
      apiEnvSelect.value = res.api_env || 'production';
    }
  });

  if (apiEnvSelect) {
    apiEnvSelect.addEventListener('change', async (e) => {
      const newEnv = e.target.value;
      await clearToken();
      chrome.storage.local.set({ api_env: newEnv }, async () => {
        await checkAuth();
        showMessage(`Switched to ${newEnv === 'local' ? 'Local Dev' : 'Production'} API`, 'success');
      });
    });
  }

  // Initialize
  await checkAuth();
  await loadDetectedJob();
  loadFormFields();

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
    chrome.storage.local.get(['job_data'], (res) => {
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

      const pageData = await getPageText(tab.id);
      if (!pageData || !pageData.bodyText) {
        showMessage('Could not extract text from this page.', 'error');
        setLoading(aiExtractBtn, false);
        return;
      }

      const response = await apiRequest('/api/resumes/extract', {
        method: 'POST',
        body: {
          url: pageData.url,
          title: pageData.title,
          bodyText: pageData.bodyText,
        }
      });

      if (response.error) {
        showMessage('AI extraction failed: ' + response.error, 'error');
        setLoading(aiExtractBtn, false);
        return;
      }

      const parsed = response.data;
      if (parsed && parsed.jobTitle) jobTitleInput.value = parsed.jobTitle;
      if (parsed && parsed.companyName) jobCompanyInput.value = parsed.companyName;
      if (parsed && parsed.jobDescription) jobDescInput.value = parsed.jobDescription;
      saveFormFields();

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
  let fileInputFallback = null;

  uploadZone.addEventListener('click', async () => {
    try {
      if (typeof window.showOpenFilePicker === 'function') {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'CV Files',
            accept: { 'application/pdf': ['.pdf'], 'text/markdown': ['.md'] },
          }],
          multiple: false,
        });
        const file = await fileHandle.getFile();
        handleFileUpload(file);
        return;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('File picker error:', err);
      } else {
        return; // user cancelled
      }
    }
    // Fallback to hidden <input type="file">
    if (!fileInputFallback) {
      fileInputFallback = document.createElement('input');
      fileInputFallback.type = 'file';
      fileInputFallback.accept = '.pdf,.md';
      fileInputFallback.style.display = 'none';
      document.body.appendChild(fileInputFallback);
      fileInputFallback.addEventListener('change', () => {
        const file = fileInputFallback.files?.[0];
        if (file) handleFileUpload(file);
        fileInputFallback.value = '';
      });
    }
    fileInputFallback.click();
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

    const dashboardLink = document.getElementById('dashboard-link');
    if (dashboardLink && tailoredData.id) {
      chrome.storage.local.get(['api_env'], (res) => {
        const isLocal = res.api_env === 'local';
        const webUrl = isLocal ? 'http://localhost:3000' : 'https://jobagg.vercel.app';
        dashboardLink.href = `${webUrl}/tailored/${tailoredData.id}`;
      });
    }
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
  async function getPageText(tabId) {
    try {
      const data = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_TEXT' });
      return data;
    } catch {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const title = document.title;
          const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          const bodyText = document.body.textContent.replace(/\s+/g, ' ').trim().slice(0, 50000);
          return { title, metaDescription: metaDesc, bodyText, url: window.location.href };
        },
      });
      return results[0]?.result;
    }
  }

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
