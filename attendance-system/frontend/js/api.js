/* Shared API utility */
const API_BASE = '/api';

async function apiRequest(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `请求失败 (${res.status})`);
  return data;
}

function getToken() { return localStorage.getItem('att_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('att_user')); } catch { return null; } }

function logout() {
  localStorage.removeItem('att_token');
  localStorage.removeItem('att_user');
  window.location.href = '/';
}

function requireAuth(requiredRole) {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) { window.location.href = '/'; return null; }
  if (requiredRole && user.role !== requiredRole) {
    alert('权限不足，即将跳转到正确页面');
    window.location.href = user.role === 'teacher' ? '/teacher.html' : '/student.html';
    return null;
  }
  return { token, user };
}

function statusLabel(status) {
  if (status === 'present') return '<span class="status-present">✅ 已签到</span>';
  if (status === 'late')    return '<span class="status-late">⏰ 迟到</span>';
  return '<span class="status-absent">❌ 缺勤</span>';
}
