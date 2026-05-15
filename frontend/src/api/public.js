import { api } from "./client";

export const publicApi = {
  getBallot: (customUrl) =>
    api.get(`/api/public/elections/${customUrl}`).then((r) => r.data.election),
  voterLogin: (customUrl, voterId, password) =>
    api
      .post(`/api/public/elections/${customUrl}/voter-login`, { voterId, password })
      .then((r) => r.data.user),
  voterLogout: (customUrl) =>
    api.post(`/api/public/elections/${customUrl}/voter-logout`),
  submit: (customUrl, answers) =>
    api
      .post(`/api/public/elections/${customUrl}/responses`, { answers })
      .then((r) => r.data),
  getResults: (customUrl) =>
    api.get(`/api/public/elections/${customUrl}/results`).then((r) => r.data),
  subscribe: (customUrl, email) =>
    api
      .post(`/api/public/elections/${customUrl}/subscribe`, { email })
      .then((r) => r.data),
};
