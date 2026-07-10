async function getApiBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['api_env'], (result) => {
      if (result.api_env === 'local') {
        resolve('http://localhost:3001');
      } else {
        resolve('https://jobaggregater-api.vercel.app');
      }
    });
  });
}

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth_token'], (result) => {
      resolve(result.auth_token || null);
    });
  });
}

async function setToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ auth_token: token }, () => {
      resolve();
    });
  });
}

async function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['auth_token', 'user_info'], () => {
      resolve();
    });
  });
}

async function apiRequest(endpoint, options = {}) {
  const baseUrl = await getApiBaseUrl();
  const token = await getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      await clearToken();
      return { error: 'UNAUTHORIZED' };
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error?.message || data.message || 'An error occurred' };
    }

    return data;
  } catch (err) {
    console.error('API request error:', err);
    return { error: 'Network error or backend is not running.' };
  }
}


