// Login page logic
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
  });
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  try {
    const data = await apiRequest('POST', '/auth/login', { username, password });
    localStorage.setItem('att_token', data.token);
    localStorage.setItem('att_user', JSON.stringify(data.user));
    window.location.href = data.user.role === 'teacher' ? '/teacher.html' : '/student.html';
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('regMsg');
  msgEl.style.display = 'none';

  const username   = document.getElementById('regUsername').value.trim();
  const password   = document.getElementById('regPassword').value;
  const name       = document.getElementById('regName').value.trim();
  const class_name = document.getElementById('regClass').value.trim();
  const student_no = document.getElementById('regStudentNo').value.trim();

  if (password.length < 6) {
    msgEl.textContent = '密码至少需要6位';
    msgEl.className = 'msg error';
    msgEl.style.display = 'block';
    return;
  }

  try {
    await apiRequest('POST', '/auth/register', { username, password, name, class_name, student_no });
    msgEl.textContent = '注册成功！请切换到登录页面登录。';
    msgEl.className = 'msg success';
    msgEl.style.display = 'block';
    document.getElementById('registerForm').reset();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'msg error';
    msgEl.style.display = 'block';
  }
});

// If already logged in, redirect
(function checkExistingSession() {
  const user = getUser();
  const token = getToken();
  if (user && token) {
    window.location.href = user.role === 'teacher' ? '/teacher.html' : '/student.html';
  }
})();
