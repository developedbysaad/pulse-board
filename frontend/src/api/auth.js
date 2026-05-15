import { api } from "./client";

export const authApi = {
  me: () => api.get("/api/auth/me").then((r) => r.data.user),
  login: (email, password) =>
    api.post("/api/auth/login", { email, password }).then((r) => r.data.user),
  signup: (name, email, password) =>
    api.post("/api/auth/signup", { name, email, password }).then((r) => r.data.user),
  logout: () => api.post("/api/auth/logout"),
  updateProfile: (data) => api.patch("/api/auth/profile", data).then((r) => r.data.user),
  forgotPassword: (email) =>
    api.post("/api/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token, password) =>
    api.post("/api/auth/reset-password", { token, password }).then((r) => r.data),
};
