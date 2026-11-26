async function call(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw Object.assign(new Error('Server bilan aloqa yo\'q.'), { code: 'network' });
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Not JSON: a static host without the API answers with HTML or 404.
  }
  if (!res.ok) {
    if (data === null) throw Object.assign(new Error('Server ulanmagan.'), { code: 'noserver' });
    throw Object.assign(new Error(data?.error || 'Xatolik.'), { status: res.status, data });
  }
  if (data === null) throw Object.assign(new Error('Server ulanmagan.'), { code: 'noserver' });
  return data;
}

export const api = {
  me: () => call('GET', '/me'),
  register: (username, password) => call('POST', '/register', { username, password }),
  login: (username, password) => call('POST', '/login', { username, password }),
  logout: () => call('POST', '/logout', {}),
  getData: () => call('GET', '/data'),
  putData: (payload) => call('PUT', '/data', payload),
  deleteAccount: (password) => call('DELETE', '/account', { password }),
  changePassword: (oldPassword, newPassword) => call('POST', '/password', { oldPassword, newPassword }),
  sessions: () => call('GET', '/sessions'),
  revokeSession: (id) => call('DELETE', `/sessions/${id}`),
  logoutAll: () => call('POST', '/logout-all', {}),
  revision: () => call('GET', '/revision'),
  telegramStatus: () => call('GET', '/telegram/status'),
  telegramLink: () => call('POST', '/telegram/link', {}),
  telegramUnlink: () => call('POST', '/telegram/unlink', {}),
  recover: (username, code, newPassword) => call('POST', '/recover', { username, code, newPassword }),
  recoveryCode: (password) => call('POST', '/recovery-code', { password }),
  support: (payload) => call('POST', '/support', payload),
  mySupport: () => call('GET', '/support/mine'),
};
