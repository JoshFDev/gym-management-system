import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
});

let navigateToLogin: (() => void) | null = null;

export const setAuthRedirect = (fn: () => void) => {
    navigateToLogin = fn;
};

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigateToLogin?.();
        }
        return Promise.reject(err);
    }
);

export default api;