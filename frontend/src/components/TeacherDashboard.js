import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import QRCode from 'qrcode.react';
import Navbar from './Navbar';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function TeacherDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [newClass, setNewClass] = useState({ name: '', code: '', schedule: [{ day: 'Monday', startTime: '09:00', endTime: '10:00' }] });
  const [markAttendance, setMarkAttendance] = useState({ studentId: '', classId: '', date: new Date().toISOString().split('T')[0], status: 'present' });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStats(selectedClass._id);
      fetchRecords(selectedClass._id);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await axios.get('/api/attendance/classes');
      setClasses(res.data);
      if (res.data.length > 0 && !selectedClass) setSelectedClass(res.data[0]);
    } catch (err) {
      toast.error('Failed to load classes');
    }
  };

  const fetchClassStats = async (classId) => {
    try {
      const res = await axios.get(`/api/attendance/stats/class/${classId}`);
      setClassStats(res.data);
    } catch (err) {}
  };

  const fetchRecords = async (classId) => {
    try {
      const res = await axios.get(`/api/attendance/classes/${classId}/records`);
      setRecords(res.data);
    } catch (err) {}
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/attendance/classes', newClass);
      toast.success('Class created successfully!');
      setNewClass({ name: '', code: '', schedule: [{ day: 'Monday', startTime: '09:00', endTime: '10:00' }] });
      setShowCreateClass(false);
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create class');
    }
  };

  const handleShowQR = async (cls) => {
    try {
      const res = await axios.get(`/api/attendance/classes/${cls._id}/qrcode`);
      setQrData(res.data);
      setShowQR(true);
    } catch (err) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/attendance/mark', { ...markAttendance, classId: selectedClass._id });
      toast.success('Attendance marked!');
      fetchClassStats(selectedClass._id);
      fetchRecords(selectedClass._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const getStatusBadge = (status) => {
    const badges = { present: 'bg-success', late: 'bg-warning text-dark', absent: 'bg-danger', excused: 'bg-info' };
    return `badge status-badge ${badges[status] || 'bg-secondary'}`;
  };

  const barChartData = classStats?.dailyRecords ? {
    labels: classStats.dailyRecords.map(d => d._id),
    datasets: [
      { label: 'Present', data: classStats.dailyRecords.map(d => d.present), backgroundColor: '#28a745' },
      { label: 'Absent', data: classStats.dailyRecords.map(d => d.absent), backgroundColor: '#dc3545' }
    ]
  } : null;

  return (
    <div>
      <Navbar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="container-fluid py-4">

        {/* QR Modal */}
        {showQR && qrData && (
          <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">QR Code - {qrData.className}</h5>
                  <button className="btn-close" onClick={() => setShowQR(false)}></button>
                </div>
                <div className="modal-body text-center p-4">
                  <p className="text-muted mb-3">Students can scan this QR code to check in</p>
                  <div className="d-inline-block p-3 bg-white border rounded-3 shadow">
                    <QRCode value={qrData.qrCode} size={200} />
                  </div>
                  <p className="text-muted mt-3 small">Valid for 2 hours</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {activeSection === 'dashboard' && (
          <div>
            <h4 className="fw-bold mb-4"><i className="fas fa-home me-2 text-primary"></i>Teacher Dashboard</h4>
            <div className="row g-3 mb-4">
              {[
                { label: 'Total Classes', value: classes.length, icon: 'fas fa-chalkboard', color: 'primary' },
                { label: 'Total Students', value: classes.reduce((a, c) => a + (c.students?.length || 0), 0), icon: 'fas fa-users', color: 'success' },
                { label: 'Sessions Today', value: classStats?.dailyRecords?.filter(d => d._id === new Date().toISOString().split('T')[0]).length || 0, icon: 'fas fa-calendar-day', color: 'info' },
                { label: 'Alerts', value: 0, icon: 'fas fa-exclamation-triangle', color: 'warning' },
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

            {classes.length > 0 && (
              <div className="row g-4">
                <div className="col-md-8">
                  <div className="card shadow-sm">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                      <span className="fw-bold">Recent Attendance Records</span>
                      <select className="form-select form-select-sm w-auto" value={selectedClass?._id || ''} onChange={e => setSelectedClass(classes.find(c => c._id === e.target.value))}>
                        {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <table className="table table-hover mb-0 attendance-table">
                          <thead><tr><th>Student</th><th>Date</th><th>Status</th></tr></thead>
                          <tbody>
                            {records.slice(0, 10).map(r => (
                              <tr key={r._id}>
                                <td>{r.student?.name}</td>
                                <td>{new Date(r.date).toLocaleDateString()}</td>
                                <td><span className={getStatusBadge(r.status)}>{r.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card shadow-sm h-100">
                    <div className="card-header bg-white fw-bold">Quick Actions</div>
                    <div className="card-body d-flex flex-column gap-2">
                      <button className="btn btn-outline-primary" onClick={() => setShowCreateClass(true)}><i className="fas fa-plus me-2"></i>Create New Class</button>
                      {selectedClass && <button className="btn btn-outline-success" onClick={() => handleShowQR(selectedClass)}><i className="fas fa-qrcode me-2"></i>Show QR Code</button>}
                      <button className="btn btn-outline-info" onClick={() => setActiveSection('reports')}><i className="fas fa-chart-bar me-2"></i>View Reports</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {classes.length === 0 && (
              <div className="card text-center p-5">
                <i className="fas fa-chalkboard fa-4x text-muted mb-3"></i>
                <h5>No classes yet</h5>
                <p className="text-muted">Create your first class to get started</p>
                <button className="btn btn-primary mx-auto" style={{ width: 200 }} onClick={() => setShowCreateClass(true)}>Create Class</button>
              </div>
            )}
          </div>
        )}

        {/* Classes Section */}
        {activeSection === 'classes' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0"><i className="fas fa-chalkboard me-2 text-primary"></i>My Classes</h4>
              <button className="btn btn-primary" onClick={() => setShowCreateClass(!showCreateClass)}>
                <i className="fas fa-plus me-1"></i>New Class
              </button>
            </div>

            {showCreateClass && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white fw-bold">Create New Class</div>
                <div className="card-body">
                  <form onSubmit={handleCreateClass}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Class Name</label>
                        <input type="text" className="form-control" placeholder="e.g. Introduction to CS" value={newClass.name}
                          onChange={e => setNewClass({ ...newClass, name: e.target.value })} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Class Code</label>
                        <input type="text" className="form-control" placeholder="e.g. CS101" value={newClass.code}
                          onChange={e => setNewClass({ ...newClass, code: e.target.value })} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Schedule</label>
                        {newClass.schedule.map((s, i) => (
                          <div key={i} className="d-flex gap-2 mb-2 align-items-center">
                            <select className="form-select" value={s.day} onChange={e => { const sched = [...newClass.schedule]; sched[i].day = e.target.value; setNewClass({ ...newClass, schedule: sched }); }}>
                              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                            </select>
                            <input type="time" className="form-control" value={s.startTime} onChange={e => { const sched = [...newClass.schedule]; sched[i].startTime = e.target.value; setNewClass({ ...newClass, schedule: sched }); }} />
                            <input type="time" className="form-control" value={s.endTime} onChange={e => { const sched = [...newClass.schedule]; sched[i].endTime = e.target.value; setNewClass({ ...newClass, schedule: sched }); }} />
                            {i > 0 && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { const sched = newClass.schedule.filter((_, j) => j !== i); setNewClass({ ...newClass, schedule: sched }); }}><i className="fas fa-times"></i></button>}
                          </div>
                        ))}
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setNewClass({ ...newClass, schedule: [...newClass.schedule, { day: 'Monday', startTime: '09:00', endTime: '10:00' }] })}>
                          <i className="fas fa-plus me-1"></i>Add Time Slot
                        </button>
                      </div>
                      <div className="col-12 d-flex gap-2">
                        <button type="submit" className="btn btn-primary"><i className="fas fa-save me-1"></i>Create Class</button>
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateClass(false)}>Cancel</button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="row g-3">
              {classes.map(cls => (
                <div key={cls._id} className="col-md-4">
                  <div className="card shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5 className="fw-bold">{cls.name}</h5>
                          <span className="badge bg-primary">{cls.code}</span>
                        </div>
                        <button className="btn btn-sm btn-outline-success" onClick={() => handleShowQR(cls)} title="Show QR Code">
                          <i className="fas fa-qrcode"></i>
                        </button>
                      </div>
                      <div className="mt-3">
                        <div className="text-muted small mb-2"><i className="fas fa-users me-1"></i>{cls.students?.length || 0} Students</div>
                        {cls.schedule?.map((s, i) => (
                          <span key={i} className="badge bg-light text-dark me-1">{s.day} {s.startTime}</span>
                        ))}
                      </div>
                    </div>
                    <div className="card-footer bg-transparent d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => { setSelectedClass(cls); setActiveSection('records'); }}>
                        <i className="fas fa-list me-1"></i>Records
                      </button>
                      <button className="btn btn-sm btn-outline-info flex-fill" onClick={() => { setSelectedClass(cls); setActiveSection('reports'); }}>
                        <i className="fas fa-chart-bar me-1"></i>Reports
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Records */}
        {activeSection === 'records' && (
          <div>
            <h4 className="fw-bold mb-4"><i className="fas fa-clipboard-list me-2 text-info"></i>Attendance Records</h4>
            <div className="card shadow-sm mb-3">
              <div className="card-body d-flex gap-3 flex-wrap">
                <select className="form-select w-auto" value={selectedClass?._id || ''} onChange={e => setSelectedClass(classes.find(c => c._id === e.target.value))}>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Manual Attendance Marking */}
            {selectedClass && classStats && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white fw-bold">Mark Attendance Manually</div>
                <div className="card-body">
                  <form onSubmit={handleMarkAttendance} className="row g-2">
                    <div className="col-md-3">
                      <select className="form-select" value={markAttendance.studentId} onChange={e => setMarkAttendance({ ...markAttendance, studentId: e.target.value })} required>
                        <option value="">Select Student</option>
                        {classStats.students?.map(s => <option key={s.student._id} value={s.student._id}>{s.student.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input type="date" className="form-control" value={markAttendance.date} onChange={e => setMarkAttendance({ ...markAttendance, date: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <select className="form-select" value={markAttendance.status} onChange={e => setMarkAttendance({ ...markAttendance, status: e.target.value })}>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <button type="submit" className="btn btn-primary w-100"><i className="fas fa-save me-1"></i>Mark</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="card shadow-sm">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0 attendance-table">
                    <thead>
                      <tr><th>Student</th><th>Date</th><th>Check-In</th><th>Status</th><th>Method</th></tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5 text-muted">No attendance records yet</td></tr>
                      ) : (
                        records.map(r => (
                          <tr key={r._id}>
                            <td><span className="fw-semibold">{r.student?.name}</span><br/><small className="text-muted">{r.student?.studentId}</small></td>
                            <td>{new Date(r.date).toLocaleDateString()}</td>
                            <td>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-'}</td>
                            <td><span className={getStatusBadge(r.status)}>{r.status}</span></td>
                            <td><small>{r.method}</small></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports */}
        {activeSection === 'reports' && (
          <div>
            <h4 className="fw-bold mb-4"><i className="fas fa-chart-bar me-2 text-success"></i>Attendance Reports</h4>
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <select className="form-select w-auto" value={selectedClass?._id || ''} onChange={e => setSelectedClass(classes.find(c => c._id === e.target.value))}>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {classStats && (
              <>
                <div className="row g-4 mb-4">
                  <div className="col-md-8">
                    <div className="card shadow-sm">
                      <div className="card-header bg-white fw-bold">Daily Attendance Trend</div>
                      <div className="card-body">
                        {barChartData && classStats.dailyRecords.length > 0 ? (
                          <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
                        ) : (
                          <div className="text-center py-5 text-muted"><i className="fas fa-chart-bar fa-3x mb-3 d-block"></i>No data available</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card shadow-sm h-100">
                      <div className="card-header bg-white fw-bold">Student Attendance Rates</div>
                      <div className="card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
                        {classStats.students?.map(s => (
                          <div key={s.student._id} className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                              <small className="fw-semibold">{s.student.name}</small>
                              <small className={`fw-bold ${s.attendanceRate < 70 ? 'text-danger' : 'text-success'}`}>{s.attendanceRate}%</small>
                            </div>
                            <div className="progress" style={{ height: 8 }}>
                              <div className={`progress-bar ${s.attendanceRate < 70 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${s.attendanceRate}%` }}></div>
                            </div>
                            {s.attendanceRate < 70 && (
                              <small className="text-danger"><i className="fas fa-exclamation-triangle me-1"></i>Below threshold</small>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Summary Table */}
                <div className="card shadow-sm">
                  <div className="card-header bg-white fw-bold">Student Summary</div>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 attendance-table">
                      <thead><tr><th>Student</th><th>ID</th><th>Present</th><th>Late</th><th>Absent</th><th>Rate</th></tr></thead>
                      <tbody>
                        {classStats.students?.map(s => (
                          <tr key={s.student._id}>
                            <td className="fw-semibold">{s.student.name}</td>
                            <td><small className="text-muted">{s.student.studentId || '-'}</small></td>
                            <td><span className="badge bg-success">{s.present}</span></td>
                            <td><span className="badge bg-warning text-dark">{s.late}</span></td>
                            <td><span className="badge bg-danger">{s.absent}</span></td>
                            <td>
                              <span className={`badge ${s.attendanceRate >= 70 ? 'bg-success' : 'bg-danger'}`}>{s.attendanceRate}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
