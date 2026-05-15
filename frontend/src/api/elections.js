import { api } from "./client";

export const electionsApi = {
  list: () => api.get("/api/elections").then((r) => r.data.elections),
  get: (id) => api.get(`/api/elections/${id}`).then((r) => r.data.election),
  create: (data) => api.post("/api/elections", data).then((r) => r.data.election),
  update: (id, data) =>
    api.patch(`/api/elections/${id}`, data).then((r) => r.data.election),
  remove: (id) => api.delete(`/api/elections/${id}`),

  /**
   * Returns { available, reason?, suggestion? } for a candidate slug.
   * Pass excludeId when editing an existing election (so the row's
   * own current slug doesn't count as a collision).
   */
  slugAvailable: (slug, excludeId) =>
    api
      .get("/api/elections/slug-available", {
        params: { slug, ...(excludeId ? { excludeId } : {}) },
      })
      .then((r) => r.data),

  launch: (id) => api.post(`/api/elections/${id}/launch`).then((r) => r.data.election),
  end: (id) => api.post(`/api/elections/${id}/end`).then((r) => r.data.election),
  publish: (id) => api.post(`/api/elections/${id}/publish`).then((r) => r.data.election),
  unpublish: (id) =>
    api.post(`/api/elections/${id}/unpublish`).then((r) => r.data.election),

  analytics: (id) =>
    api.get(`/api/elections/${id}/analytics`).then((r) => r.data),

  questions: {
    list: (electionId) =>
      api.get(`/api/elections/${electionId}/questions`).then((r) => r.data.questions),
    create: (electionId, data) =>
      api.post(`/api/elections/${electionId}/questions`, data).then((r) => r.data.question),
    update: (electionId, questionId, data) =>
      api
        .patch(`/api/elections/${electionId}/questions/${questionId}`, data)
        .then((r) => r.data.question),
    remove: (electionId, questionId) =>
      api.delete(`/api/elections/${electionId}/questions/${questionId}`),
  },

  options: {
    create: (electionId, questionId, data) =>
      api
        .post(`/api/elections/${electionId}/questions/${questionId}/options`, data)
        .then((r) => r.data.option),
    update: (electionId, questionId, optionId, data) =>
      api
        .patch(
          `/api/elections/${electionId}/questions/${questionId}/options/${optionId}`,
          data
        )
        .then((r) => r.data.option),
    remove: (electionId, questionId, optionId) =>
      api.delete(
        `/api/elections/${electionId}/questions/${questionId}/options/${optionId}`
      ),
  },

  voters: {
    list: (electionId) =>
      api.get(`/api/elections/${electionId}/voters`).then((r) => r.data.voters),
    create: (electionId, data) =>
      api
        .post(`/api/elections/${electionId}/voters`, data)
        .then((r) => r.data.voter),
    update: (electionId, voterId, data) =>
      api
        .patch(`/api/elections/${electionId}/voters/${voterId}`, data)
        .then((r) => r.data.voter),
    remove: (electionId, voterId) =>
      api.delete(`/api/elections/${electionId}/voters/${voterId}`),
  },
};
