const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export function getAccessToken() {
  return localStorage.getItem("bc_access");
}
export function saveSession(payload) {
  localStorage.setItem("bc_access", payload.tokens.access);
  localStorage.setItem("bc_refresh", payload.tokens.refresh);
  localStorage.setItem("bc_user", JSON.stringify(payload.user));
}
export function clearSession() {
  localStorage.removeItem("bc_access");
  localStorage.removeItem("bc_refresh");
  localStorage.removeItem("bc_user");
}
async function request(path, options = {}) {
  const token = getAccessToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) clearSession();
    const detail = body.detail || Object.entries(body).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ") || "Request failed";
    throw new Error(detail);
  }
  return body;
}
export const api = {
  register: (data) => request("/auth/register/", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login/", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/users/me/"),
  feed: () => request("/feed/home/?limit=30"),
  createPost: (data) => request("/posts/", { method: "POST", body: JSON.stringify(data) }),
  like: (id, liked) => request(`/posts/${id}/like/`, { method: liked ? "PUT" : "DELETE" }),
  repost: (id, reposted) => request(`/posts/${id}/repost/`, { method: reposted ? 'PUT' : 'DELETE' }),
  replies: (id) => request(`/posts/${id}/replies/`),
  createReply: (id, text) => request(`/posts/${id}/replies/`, { method: "POST", body: JSON.stringify({ text, language: "en", visibility: "public" }) }),
  bookmark: (id, saved) => request(`/posts/${id}/bookmark/`, { method: saved ? "PUT" : "DELETE" }),
  bookmarks: () => request("/bookmarks/"),
  follow: (username, following) => request(`/users/${encodeURIComponent(username)}/follow/`, { method: following ? "PUT" : "DELETE" }),
  searchUsers: (q) => request(`/users/search/?q=${encodeURIComponent(q)}`),
  notifications: () => request("/notifications/"),
  markNotificationsRead: () => request("/notifications/read/", { method: "POST" }),
  deletePost: (id) => request(`/posts/${id}/`, { method: "DELETE" }),
};
export function mapApiPost(p) {
  return {
    id: p.id, name: p.author.display_name || p.author.username,
    handle: `@${p.author.username}`, avatar: (p.author.display_name || p.author.username || "?").slice(0, 2).toUpperCase(),
    color: "blue", verified: false, time: new Date(p.created_at).toLocaleString(),
    location: "India", text: p.text, tags: (p.text.match(/#[\p{L}\p{N}_]+/gu) || []).map(t => t.replace(/^#/, "")),
    likes: p.likes_count || 0, replies: p.replies_count || 0, reposts: p.reposts_count || 0,
    following: false, liked: !!p.liked_by_me, reposted: false, saved: !!p.bookmarked_by_me,
    backendId: p.id,
  };
}
