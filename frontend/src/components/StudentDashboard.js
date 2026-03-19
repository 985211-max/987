import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Navbar from './Navbar';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudentDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeSection === 'history' && selectedClass) fetchRecords(selectedClass);
  }, [activeSection, selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get('/api/attendance/classes');
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClass(res.data[0]._id);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/attendance/stats/student');
      setStats(res.data);
    } catch (err) {}
  };

  const fetchRecords = async (classId) => {
    try {
      const res = await axios.get(`/api/attendance/classes/${classId}/records`);
      setRecords(res.data);
    } catch (err) {}
  };

  const handleCheckIn = async (classId) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/attendance/checkin', { classId });
      toast.success(res.data.message);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/attendance/classes/join', { code: joinCode });
      toast.success(res.data.message);
      setJoinCode('');
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join class');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: 'bg-success',
      late: 'bg-warning text-dark',
      absent: 'bg-danger',
      excused: 'bg-info'
    };
    return `badge status-badge ${badges[status] || 'bg-secondary'}`;
  };

  const chartData = stats ? {
    labels: ['Present', 'Late', 'Absent', 'Excused'],
    datasets: [{
      data: [stats.present, stats.late, stats.absent, stats.excused],
      backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#17a2b8'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  } : null;

  return (
    <div>
      <Navbar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="container-fluid py-4">
        {/* Dashboard */}
        {activeSection === 'dashboard' && (
          <div>
            <h4 className="fw-bold mb-4"><i className="fas fa-home me-2 text-primary"></i>My Dashboard</h4>
            <div className="row g-3 mb-4">
              {[
                { label: 'Total Sessions', value: stats?.total || 0, icon: 'fas fa-calendar-alt', color: 'primary' },
                { label: 'Present', value: stats?.present || 0, icon: 'fas fa-check', color: 'success' },
                { label: 'Late', value: stats?.late || 0, icon: 'fas fa-clock', color: 'warning' },
                { label: 'Absent', value: stats?.absent || 0, icon: 'fas fa-times', color: 'danger' },
              ].map(card => (
                <div key={card.label} className="col-6 col-md-3">
                  <div className={`card stat-card border-${card.color} border-start border-4`}>
                    <div className="card-body d-flex align-items-center">
                      <div className={`text-${card.color} me-3 fs-3`}><i className={card.icon}></i></div>
                      <div>
                        <div className="text-muted small">{card.label}</div>
                        <div className="fs-4 fw-bold">{card.value}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-4">
              <div className="col-md-5">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white fw-bold">Attendance Rate</div>
                  <div className="card-body d-flex flex-column align-items-center justify-content-center">
                    {chartData && (stats?.total || 0) > 0 ? (
                      <>
                        <div style={{ width: 220, height: 220 }}>
                          <Doughnut data={chartData} options={{ plugins: { legend: { position: 'bottom' } }, cutout: '70%' }} />
                        </div>
                        <div className="display-6 fw-bold text-primary mt-2">{stats?.attendanceRate}%</div>
                        <div className="text-muted small">Overall Attendance</div>
                      </>
                    ) : (
                      <div className="text-center text-muted py-4">
                        <i className="fas fa-chart-pie fa-3x mb-3 d-block"></i>
                        No attendance data yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-md-7">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white fw-bold">Quick Check-In</div>
                  <div className="card-body">
                    {classes.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <i className="fas fa-book-open fa-3x mb-3 d-block"></i>
                        <p>No classes enrolled. Join a class first!</p>
                        <button className="btn btn-primary" onClick={() => setActiveSection('classes')}>Browse Classes</button>
                      </div>
                    ) : (
                      <div className="list-group">
                        {classes.map(cls => (
                          <div key={cls._id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-semibold">{cls.name}</div>
                              <div className="text-muted small">{cls.teacher?.name} • {cls.code}</div>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => handleCheckIn(cls._id)} disabled={loading}>
                              <i className="fas fa-check me-1"></i>Check In
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Check-In Section */}
        {activeSection === 'checkin' && (
          <div>
            <h4 className="fw-bold mb-4"><i className="fas fa-check-circle me-2 text-success"></i>Check In to Class</h4>
            {classes.length === 0 ? (
              <div className="card text-center p-5">
                <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
                <p className="text-muted">You are not enrolled in any classes yet.</p>
                <button className="btn btn-primary" onClick={() => setActiveSection('classes')}>Join a Class</button>
              </div>
            ) : (
              <div className="row g-3">
                {classes.map(cls => (
                  <div key={cls._id} className="col-md-4">
                    <div className="card shadow-sm h-100">
                      <div className="card-body text-center p-4">
                        <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 70, height: 70 }}>
                          <i className="fas fa-book fa-2x text-primary"></i>
                        </div>
                        <h5 className="fw-bold">{cls.name}</h5>
                        <p className="text-muted small mb-1">Code: <span className="badge bg-secondary">{cls.code}</span></p>
                        <p className="text-muted small">Teacher: {cls.teacher?.name}</p>
                        {cls.schedule && cls.schedule.length > 0 && (
                          <div className="mb-3">
                            {cls.schedule.map((s, i) => (
                              <span key={i} className="badge bg-light text-dark me-1">{s.day} {s.startTime}-{s.endTime}</span>
                            ))}
                          </div>
                        )}
                        <button
                          className="btn btn-primary checkin-btn w-100"
                          onClick={() => handleCheckIn(cls._id)}
                          disabled={loading}
                        >
                          {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-check-circle me-2"></i>}
                          Check In Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendance History */}
        {activeSection === 'history' && (
          <div>
            <h4 className="fw-bold mb-4"><i className="fas fa-history me-2 text-info"></i>Attendance History</h4>
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <select className="form-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); fetchRecords(e.target.value); }}>
                  {classes.map(cls => <option key={cls._id} value={cls._id}>{cls.name}</option>)}
                </select>
              </div>
            </div>
            <div className="card shadow-sm">
              <div className="card-body p-0">
                {records.length === 0 ? (
                  <div className="text-center py-5 text-muted"><i className="fas fa-clipboard fa-3x mb-3 d-block"></i>No attendance records yet</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 attendance-table">
                      <thead><tr><th>Date</th><th>Check-In Time</th><th>Status</th><th>Method</th></tr></thead>
                      <tbody>
                        {records.map(r => (
                          <tr key={r._id}>
                            <td>{new Date(r.date).toLocaleDateString()}</td>
                            <td>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-'}</td>
                            <td><span className={getStatusBadge(r.status)}>{r.status}</span></td>
                            <td><span className="badge bg-light text-dark">{r.method}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Classes Section */}
        {activeSection === 'classes' && (
          <div>
            <h4 className="fw-bold mb-4"><i className="fas fa-book me-2 text-warning"></i>My Classes</h4>
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white fw-bold">Join a New Class</div>
              <div className="card-body">
                <form onSubmit={handleJoinClass} className="d-flex gap-2">
                  <input type="text" className="form-control" placeholder="Enter class code (e.g. CS101)" value={joinCode}
                    onChange={e => setJoinCode(e.target.value)} required />
                  <button type="submit" className="btn btn-primary px-4"><i className="fas fa-plus me-1"></i>Join</button>
                </form>
              </div>
            </div>
            <div className="row g-3">
              {classes.length === 0 ? (
                <div className="col-12 text-center py-5 text-muted"><i className="fas fa-book-open fa-4x mb-3 d-block"></i>No classes yet. Join one above!</div>
              ) : (
                classes.map(cls => (
                  <div key={cls._id} className="col-md-4">
                    <div className="card shadow-sm h-100">
                      <div className="card-body">
                        <h5 className="fw-bold">{cls.name}</h5>
                        <p className="text-muted small">Code: {cls.code}</p>
                        <p className="text-muted small">Teacher: {cls.teacher?.name}</p>
                        {cls.schedule?.map((s, i) => (
                          <span key={i} className="badge bg-primary me-1 mb-1">{s.day} {s.startTime}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
