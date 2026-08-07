// ─── Auth APIs ────────────────────────────────────────────────────────────────
import apiClient, { plainClient } from './client';

export const authApi = {
  signIn: (email, password) =>
    plainClient.post('/auth/signin', { email, password }),

  signOut: () =>
    apiClient.post('/auth/signout'),

  getMe: () =>
    apiClient.get('/auth/me'),

  refresh: (refreshToken) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  resendVerification: (email) =>
    apiClient.post('/auth/resend-verification', { email }),
};

// ─── Contest APIs ─────────────────────────────────────────────────────────────
export const contestApi = {
  getAll: () =>
    apiClient.get('/contests'),

  getById: (id) =>
    apiClient.get(`/contests/${id}`),
};

// ─── Team APIs ────────────────────────────────────────────────────────────────
export const teamApi = {
  getMyTeams: () =>
    apiClient.get('/teams/me'),

  getMyTeamInContest: (contestId) =>
    apiClient.get(`/teams/contests/${contestId}/my`),

  getTeamById: (id) =>
    apiClient.get(`/teams/${id}`),
};

// ─── Mentor Assignment APIs ────────────────────────────────────────────────────
export const mentorApi = {
  getMyAssignments: () =>
    apiClient.get('/mentor-assignments/me'),
};

// ─── Chat APIs ─────────────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () =>
    apiClient.get('/chat/conversations'),

  getTeamMentors: (teamId) =>
    apiClient.get(`/chat/team/${teamId}/mentors`),

  getMessages: (contestId, roundId, teamId, mentorId, page = 1, limit = 50) =>
    apiClient.get(`/chat/${contestId}/${roundId}/${teamId}/${mentorId}/messages`, {
      params: { page, limit },
    }),

  sendMessage: (contestId, roundId, teamId, mentorId, content) =>
    apiClient.post(`/chat/${contestId}/${roundId}/${teamId}/${mentorId}/messages`, { content }),

  checkStatus: (contestId, roundId) =>
    apiClient.get(`/chat/${contestId}/${roundId}/status`),
};

// ─── Notification APIs ─────────────────────────────────────────────────────────
export const notificationApi = {
  getAll: () =>
    apiClient.get('/notifications'),

  markRead: (id) =>
    apiClient.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch('/notifications/read-all'),
};
