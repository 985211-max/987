// Student dashboard logic
const auth = requireAuth('student');
if (!auth) throw new Error('not authenticated');

const { token, user } = auth;

document.getElementById('userInfo').textContent = `👤 ${user.name}（${user.class_name}）`;
document.getElementById('logoutBtn').addEventListener('click', logout);

let currentSession = null;
let countdownTimer = null;

// ── Load today's session ──────────────────────────────────────────────────────
async function loadTodaySession() {
  try {
    currentSession = await apiRequest('GET', '/attendance/sessions/today', null, token);
    if (currentSession) {
      updateSessionUI(currentSession);
    } else {
      showNoSession();
    }
  } catch (err) {
    showBanner('danger', '加载签到状态失败: ' + err.message);
  }
}

function showNoSession() {
  document.getElementById('noSession').style.display = 'block';
  document.getElementById('checkinBtn').style.display = 'none';
  document.getElementById('checkinStatus').style.display = 'none';
  showBanner('info', '今日暂无签到任务，请等待老师发起');
}

function updateSessionUI(session) {
  document.getElementById('noSession').style.display = 'none';
  document.getElementById('checkinStatus').style.display = 'block';
  document.getElementById('sessionDate').textContent = session.date;
  document.getElementById('deadlineInfo').textContent = `截止时间：${session.deadline}`;

  startCountdown(session);
}

function startCountdown(session) {
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => tick(session), 1000);
  tick(session);
}

function tick(session) {
  const now = new Date();
  const deadline = new Date(`${session.date}T${session.deadline}:00`);
  const diff = deadline - now;

  if (diff > 0) {
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('countdown').textContent =
      `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    document.getElementById('checkinBtn').style.display = 'inline-flex';
    showBanner('success', '✅ 签到进行中，请在截止时间前完成签到');
  } else {
    const overMin = Math.floor(-diff / 60000);
    document.getElementById('countdown').textContent = `已过截止 ${overMin} 分钟`;
    document.getElementById('countdown').style.color = '#e74c3c';
    document.getElementById('checkinBtn').style.display = 'inline-flex';
    document.getElementById('checkinBtn').style.background = '#e67e22';
    showBanner('warning', '⚠️ 已超过签到截止时间，签到将记为迟到');
  }
}

function showBanner(type, text) {
  const banner = document.getElementById('statusBanner');
  banner.className = `status-banner ${type}`;
  document.getElementById('statusText').textContent = text;
}

// ── Check in ──────────────────────────────────────────────────────────────────
document.getElementById('checkinBtn').addEventListener('click', async () => {
  if (!currentSession) return;
  const btn = document.getElementById('checkinBtn');
  btn.disabled = true;
  btn.textContent = '签到中...';

  try {
    const result = await apiRequest('POST', '/attendance/checkin', { session_id: currentSession.id }, token);
    clearInterval(countdownTimer);
    document.getElementById('countdown').textContent = '';
    btn.style.display = 'none';

    const resultEl = document.getElementById('checkinResult');
    resultEl.style.display = 'block';
    resultEl.className = `checkin-result ${result.status === 'late' ? 'late' : 'success'}`;
    resultEl.innerHTML = `
      <div style="font-size:2.5rem;margin-bottom:10px">${result.status === 'late' ? '⏰' : '✅'}</div>
      <div>${result.message}</div>
      <div style="font-size:0.9rem;margin-top:8px;opacity:0.7">签到时间：${result.check_in_time}</div>
    `;
    showBanner(result.status === 'late' ? 'warning' : 'success',
      result.status === 'late' ? '已迟到签到，请注意准时' : '签到成功！');
    loadMyRecords();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '✅ 立即签到';
    showBanner('danger', '签到失败: ' + err.message);
  }
});

// ── My records ────────────────────────────────────────────────────────────────
async function loadMyRecords() {
  try {
    const records = await apiRequest('GET', '/attendance/my-records', null, token);
    const tbody = document.getElementById('myRecordsTbody');

    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">暂无记录</td></tr>';
      return;
    }

    // Compute stats
    const present = records.filter(r => r.status === 'present').length;
    const late    = records.filter(r => r.status === 'late').length;
    const absent  = records.filter(r => r.status === 'absent').length;
    document.getElementById('myStats').innerHTML = `
      <span class="stat-pill green">出勤 ${present}</span>
      <span class="stat-pill orange">迟到 ${late}</span>
      <span class="stat-pill red">缺勤 ${absent}</span>
    `;

    tbody.innerHTML = records.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.session_class}</td>
        <td>${r.check_in_time || '—'}</td>
        <td>${r.deadline}</td>
        <td>${statusLabel(r.status)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('加载记录失败:', err);
  }
}

// Init
loadTodaySession();
loadMyRecords();
// Refresh session status every 30 seconds
setInterval(loadTodaySession, 30000);
