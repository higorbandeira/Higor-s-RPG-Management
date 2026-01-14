import axios from "axios";

export const http = axios.create({
  baseURL: "/api", // reverse proxy do monorepo: /api -> FastAPI
  withCredentials: true, // necessário pro refresh cookie
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original?._retry) {
      return Promise.reject(err);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(err);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(http(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const r = await http.post("/auth/refresh");
      const newToken = r.data.accessToken as string;
      setAccessToken(newToken);
      resolveQueue(newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return http(original);
    } catch (e) {
      setAccessToken(null);
      resolveQueue(null);
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
