import axios, { type InternalAxiosRequestConfig } from 'axios';
export const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
let refresh: Promise<unknown> | undefined;
http.interceptors.response.use(
  response => response,
  async error => {
    const request = error.config as
      | (InternalAxiosRequestConfig & { sessionRetried?: boolean })
      | undefined;
    if (
      error.response?.status === 401 &&
      request &&
      !request.sessionRetried &&
      !request.url?.startsWith('/auth/')
    ) {
      request.sessionRetried = true;
      try {
        if (!refresh)
          refresh = http.post('/auth/refresh').finally(() => {
            refresh = undefined;
          });
        await refresh;
        return http.request(request);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    if (error.response?.data?.message)
      error.message = error.response.data.message;
    return Promise.reject(error);
  }
);
