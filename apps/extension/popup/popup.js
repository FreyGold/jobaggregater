// ─── Popup Controller ───────────────────────────────────────────────

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
  
  // DOM Elements - Result View
  const scoreBadge = document.getElementById('score-badge');
  const tailoredPreview = document.getElementById('tailored-content-preview');
  const resetBtn = document.getElementById('reset-btn');
  const copyBtn = document.getElementById('copy-preview-btn');

  // DOM Elements - Global Msg
  const globalMessage = document.getElementById('global-message');

  let activeUser = null;

  // Initialize
  await checkAuth();

  // 1. Auth check and view rendering
  async function checkAuth() {
    const token = await getToken();
    if (token) {
      // Get saved user info
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
    
    // Add logout listener
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

  // 2. Fetch and render resumes dropdown
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
    // Reset options but keep first
    resumeSelect.innerHTML = '<option value="">-- Choose a saved CV --</option>';
    
    resumes.forEach((resume) => {
      const option = document.createElement('option');
      option.value = resume.id;
      option.textContent = `${resume.fileName} (${new Date(resume.createdAt).toLocaleDateString()})`;
      resumeSelect.appendChild(option);
    });
  }

  // 3. Load detected job details from session storage
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

  // 4. Handle login submit
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

  // 5. File uploads
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
    // Validate file
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
    
    // Select newly uploaded resume automatically
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

  // 6. Tailoring Action
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

    // Load active job url from session if matched
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

    // Success! Show tailored preview
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

  // 7. Reset and Copy Actions
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

  // Helpers
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
