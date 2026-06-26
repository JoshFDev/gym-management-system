import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("member_token");

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
            localStorage.removeItem("member_token");
            localStorage.removeItem("user");
            localStorage.removeItem("member_user");
            if (window.location.pathname !== "/login" && window.location.pathname !== "/miembro/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

export default api;