import axios, { AxiosError, AxiosInstance } from "axios";

let accessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export const http: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function doRefresh(): Promise<string> {
  const res = await axios.post(
    "/api/auth/refresh",
    {},
    { withCredentials: true }
  );
  return res.data.accessToken as string;
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = doRefresh()
          .then((token) => {
            setAccessToken(token);
            return token;
          })
          .finally(() => {
            isRefreshing = false;
          });
      }

      try {
        const token = await refreshPromise!;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        setAccessToken(null);
      }
    }

    return Promise.reject(error);
  }
);
