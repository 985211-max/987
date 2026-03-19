// Teacher dashboard logic
const auth = requireAuth('teacher');
if (!auth) throw new Error('not authenticated');

const { token, user } = auth;

document.getElementById('userInfo').textContent = `👤 ${user.name}（教师）`;
document.getElementById('logoutBtn').addEventListener('click', logout);

// Set today's date as default
document.getElementById('sessionDate').value = new Date().toISOString().slice(0, 10);
document.getElementById('sessionDeadline').value = '22:30';
document.getElementById('sessionClass').value = user.class_name || '';

let activeSession = null;
let trendChart = null;
let pieChart = null;

// ── Overview ──────────────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const ov = await apiRequest('GET', '/stats/overview', null, token);
    document.getElementById('ov-sessions').textContent = ov.totalSessions;
    document.getElementById('ov-students').textContent = ov.totalStudents;
    document.getElementById('ov-alerts').textContent   = ov.unreadAlerts;
    document.getElementById('ov-today').textContent    = ov.todaySession ? '进行中' : '未开始';

    if (ov.todaySession) {
      activeSession = ov.todaySession;
      showActiveSession(ov.todaySession);
    }
  } catch (err) {
    console.error('Overview error:', err);
  }
}

// ── Create Session ────────────────────────────────────────────────────────────
document.getElementById('createSessionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('sessionMsg');
  msgEl.style.display = 'none';

  const class_name = document.getElementById('sessionClass').value.trim();
  const date       = document.getElementById('sessionDate').value;
  const deadline   = document.getElementById('sessionDeadline').value;

  try {
    const res = await apiRequest('POST', '/attendance/sessions', { class_name, date, deadline }, token);
    msgEl.textContent = `✅ ${res.message}（ID: ${res.session_id}）`;
    msgEl.className = 'msg success';
    msgEl.style.display = 'block';
    await loadOverview();
    await loadClassSessions();
    await loadActiveSessionRecords();
  } catch (err) {
    msgEl.textContent = '❌ ' + err.message;
    msgEl.className = 'msg error';
    msgEl.style.display = 'block';
  }
});

// ── Active Session UI ─────────────────────────────────────────────────────────
function showActiveSession(session) {
  document.getElementById('activeSessionCard').style.display = 'block';
  document.getElementById('activeSessionInfo').textContent =
    `${session.class_name}  ${session.date}  截止 ${session.deadline}`;
  loadActiveSessionRecords();
}

async function loadActiveSessionRecords() {
  if (!activeSession) return;
  try {
    const records = await apiRequest('GET', `/attendance/sessions/${activeSession.id}/records`, null, token);
    const tbody   = document.getElementById('liveRecordTbody');
    const present = records.filter(r => r.status !== 'absent').length;
    const total   = records.length;
    const rate    = total ? Math.round(100 * present / total) : 0;

    document.getElementById('progressText').textContent = `已签到 ${present}/${total}`;
    document.getElementById('progressRate').textContent = `${rate}%`;
    document.getElementById('progressBar').style.width  = `${rate}%`;

    tbody.innerHTML = records.map(r => `
      <tr>
        <td>${r.student_no || '—'}</td>
        <td>${r.student_name}</td>
        <td>${r.check_in_time || '—'}</td>
        <td>${statusLabel(r.status)}</td>
        <td>
          <select class="form-select" onchange="updateRecord(${r.id}, this.value)">
            <option value="present" ${r.status==='present'?'selected':''}>出勤</option>
            <option value="late"    ${r.status==='late'?'selected':''}>迟到</option>
            <option value="absent"  ${r.status==='absent'?'selected':''}>缺勤</option>
          </select>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="loading">暂无记录</td></tr>';

    updatePieChart(records);
  } catch (err) {
    console.error('加载实时记录失败:', err);
  }
}

async function updateRecord(recordId, status) {
  try {
    await apiRequest('PATCH', `/attendance/records/${recordId}`, { status }, token);
    await loadActiveSessionRecords();
  } catch (err) {
    alert('更新失败: ' + err.message);
  }
}

// Close session
document.getElementById('closeSessionBtn').addEventListener('click', async () => {
  if (!activeSession) return;
  if (!confirm('确认关闭当前签到？关闭后学生将无法继续签到。')) return;
  try {
    await apiRequest('PATCH', `/attendance/sessions/${activeSession.id}/close`, null, token);
    document.getElementById('activeSessionCard').style.display = 'none';
    activeSession = null;
    await loadOverview();
  } catch (err) {
    alert('关闭失败: ' + err.message);
  }
});

document.getElementById('refreshRecordsBtn').addEventListener('click', loadActiveSessionRecords);

// Generate alerts
document.getElementById('generateAlertsBtn').addEventListener('click', async () => {
  if (!activeSession) return;
  try {
    const res = await apiRequest('POST', `/attendance/sessions/${activeSession.id}/generate-alerts`, null, token);
    alert(res.message);
    await loadAlerts();
    await loadOverview();
  } catch (err) {
    alert('失败: ' + err.message);
  }
});

// ── Class sessions & trend chart ──────────────────────────────────────────────
async function loadClassSessions() {
  try {
    const sessions = await apiRequest('GET', '/stats/class', null, token);
    if (!sessions.length) return;

    const recent = sessions.slice(0, 10).reverse();
    const labels = recent.map(s => s.date.slice(5)); // MM-DD
    const presentData = recent.map(s => Number(s.present_count) + Number(s.late_count));
    const absentData  = recent.map(s => Number(s.absent_count));

    const ctx = document.getElementById('trendChart').getContext('2d');
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '出勤（含迟到）', data: presentData, backgroundColor: '#27ae60', borderRadius: 6 },
          { label: '缺勤', data: absentData, backgroundColor: '#e74c3c', borderRadius: 6 },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
      }
    });
  } catch (err) {
    console.error('加载趋势图失败:', err);
  }
}

function updatePieChart(records) {
  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const absent  = records.filter(r => r.status === 'absent').length;

  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['已签到', '迟到', '缺勤'],
      datasets: [{
        data: [present, late, absent],
        backgroundColor: ['#27ae60', '#e67e22', '#e74c3c'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (c) => `${c.label}: ${c.raw}人` } }
      }
    }
  });
}

// ── Student summary ───────────────────────────────────────────────────────────
async function loadStudentSummary() {
  try {
    const students = await apiRequest('GET', '/stats/student', null, token);
    const tbody = document.getElementById('studentSummaryTbody');

    tbody.innerHTML = students.map(s => {
      const rate = Number(s.attendance_rate) || 0;
      let risk = '<span class="risk-low">正常</span>';
      if (s.absent_count >= 3 || rate < 70) {
        risk = '<span class="risk-high">⚠️ 高风险</span>';
      } else if (s.absent_count >= 1 || rate < 90) {
        risk = '<span class="risk-mid">注意</span>';
      }
      return `
        <tr>
          <td>${s.student_no || '—'}</td>
          <td>${s.name}</td>
          <td>${s.total_sessions}</td>
          <td><span class="status-present">${s.present_count}</span></td>
          <td><span class="status-late">${s.late_count}</span></td>
          <td><span class="status-absent">${s.absent_count}</span></td>
          <td>${rate}%</td>
          <td>${risk}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="8" class="loading">暂无数据</td></tr>';
  } catch (err) {
    console.error('加载学生汇总失败:', err);
  }
}

// ── Alerts ────────────────────────────────────────────────────────────────────
async function loadAlerts() {
  try {
    const alerts = await apiRequest('GET', '/attendance/alerts', null, token);
    const listEl = document.getElementById('alertList');
    const unread = alerts.filter(a => !a.is_read).length;
    document.getElementById('alertCount').textContent = unread;

    if (!alerts.length) {
      listEl.innerHTML = '<div class="empty-state">暂无异常提醒 🎉</div>';
      return;
    }

    listEl.innerHTML = alerts.map(a => `
      <div class="alert-item ${a.alert_type} ${a.is_read ? 'read' : ''}">
        <div>
          <div class="alert-text">
            ${a.is_read ? '' : '<strong>🔴 </strong>'}
            ${a.message}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="alert-time">${a.created_at.slice(0, 16)}</span>
          ${!a.is_read ? `<button class="btn btn-sm btn-outline" style="border-color:var(--muted);color:var(--muted)" onclick="markRead(${a.id}, this)">已读</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('加载提醒失败:', err);
  }
}

async function markRead(alertId, btn) {
  try {
    await apiRequest('PATCH', `/attendance/alerts/${alertId}/read`, null, token);
    btn.closest('.alert-item').classList.add('read');
    btn.remove();
    const cnt = document.getElementById('alertCount');
    cnt.textContent = Math.max(0, parseInt(cnt.textContent || '0') - 1);
  } catch (err) {
    console.error(err);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadOverview();
  await Promise.all([loadClassSessions(), loadStudentSummary(), loadAlerts()]);
}

init();
// Auto-refresh live records every 15 seconds if a session is active
setInterval(() => { if (activeSession) loadActiveSessionRecords(); }, 15000);
// Refresh overview every minute
setInterval(loadOverview, 60000);
