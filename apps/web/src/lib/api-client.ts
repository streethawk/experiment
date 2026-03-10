import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request interceptor — attach auth token and tenant headers
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('carecore_access_token');
      const homeId = localStorage.getItem('carecore_home_id');
      const orgId = localStorage.getItem('carecore_org_id');

      if (token) config.headers.Authorization = `Bearer ${token}`;
      if (homeId) config.headers['X-Home-ID'] = homeId;
      if (orgId) config.headers['X-Organisation-ID'] = orgId;
    }
    return config;
  });

  // Response interceptor — handle 401 token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('carecore_refresh_token');
          if (!refreshToken) throw new Error('No refresh token');

          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          localStorage.setItem('carecore_access_token', data.access_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }

          return client(originalRequest);
        } catch {
          // Refresh failed — redirect to login
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient();
