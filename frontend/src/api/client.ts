const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api` 
  : '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('wastewise_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('wastewise_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('wastewise_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle FormData (e.g. CSV upload) by letting browser set multipart boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      // Read response body as text once to avoid "body stream already read" error
      const rawText = await response.text();
      try {
        const errJson = JSON.parse(rawText);
        if (Array.isArray(errJson.detail)) {
          // Format FastAPI / Pydantic validation error objects into readable text
          errorDetail = errJson.detail
            .map((item: any) => {
              const field = Array.isArray(item.loc) && item.loc.length > 0 
                ? item.loc[item.loc.length - 1] 
                : '';
              const msg = item.msg || 'Invalid input';
              return field ? `${field}: ${msg}` : msg;
            })
            .join(' | ');
        } else if (typeof errJson.detail === 'string') {
          errorDetail = errJson.detail;
        } else if (typeof errJson.message === 'string') {
          errorDetail = errJson.message;
        } else if (typeof errJson === 'string') {
          errorDetail = errJson;
        } else {
          errorDetail = JSON.stringify(errJson);
        }
      } catch {
        if (rawText.includes('ECONNREFUSED') || response.status === 502 || response.status === 504) {
          errorDetail = 'Backend server is not reachable. Please ensure the FastAPI server is running on port 8000.';
        } else if (rawText && rawText.length < 300 && !rawText.trim().startsWith('<')) {
          errorDetail = rawText;
        } else {
          errorDetail = `Server returned error (${response.status}: ${response.statusText || 'Internal Server Error'})`;
        }
      }
    } catch {
      errorDetail = response.statusText || `HTTP Error ${response.status}`;
    }
    throw new Error(errorDetail);
  }

  // For 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
