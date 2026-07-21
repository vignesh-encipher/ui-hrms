import axios from 'axios';
import { store } from '@/store';
import { logout, updateToken } from '@/store/authSlice';
import { notification } from 'antd';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://be-hrms-x40s.onrender.com",
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT
API.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auto-refresh and global notification on error
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Show Ant Design notification popup for any API error
    let errorMessage = 'An unexpected error occurred while communicating with the server.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (typeof error.response?.data === 'string') {
      errorMessage = error.response.data;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Suppress notification if request was cancelled intentionally
    if (!axios.isCancel(error)) {
      notification.error({
        message: `API Request Failed (${error.response?.status || 'Network Error'})`,
        description: errorMessage,
        placement: 'topRight',
        duration: 3,
      });
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = store.getState().auth.refreshToken;
      if (!refreshToken) {
        store.dispatch(logout());
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "https://be-hrms-x40s.onrender.com"}/auth/refresh`,
          { refreshToken }
        );
        const { token, refreshToken: newRefreshToken } = res.data;

        store.dispatch(updateToken({ token, refreshToken: newRefreshToken }));
        processQueue(null, token);
        isRefreshing = false;

        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
