import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeSection, setActiveSection }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {}
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'late_alert': return 'fas fa-clock text-warning';
      case 'absence_alert': return 'fas fa-exclamation-triangle text-danger';
      case 'reminder': return 'fas fa-bell text-info';
      default: return 'fas fa-info-circle text-secondary';
    }
  };

  const studentSections = [
    { id: 'dashboard', icon: 'fas fa-home', label: 'Dashboard' },
    { id: 'checkin', icon: 'fas fa-check-circle', label: 'Check In' },
    { id: 'history', icon: 'fas fa-history', label: 'My Records' },
    { id: 'classes', icon: 'fas fa-book', label: 'My Classes' },
  ];

  const teacherSections = [
    { id: 'dashboard', icon: 'fas fa-home', label: 'Dashboard' },
    { id: 'classes', icon: 'fas fa-chalkboard', label: 'Classes' },
    { id: 'records', icon: 'fas fa-clipboard-list', label: 'Attendance' },
    { id: 'reports', icon: 'fas fa-chart-bar', label: 'Reports' },
  ];

  const sections = user?.role === 'teacher' ? teacherSections : studentSections;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" to="#">
          <i className="fas fa-user-check me-2"></i>Smart Attendance
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {sections.map(s => (
              <li key={s.id} className="nav-item">
                <button className={`nav-link btn btn-link text-white ${activeSection === s.id ? 'fw-bold border-bottom border-2 border-white' : ''}`}
                  onClick={() => setActiveSection(s.id)}>
                  <i className={`${s.icon} me-1`}></i>{s.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-3">
            {/* Notifications */}
            <div className="position-relative">
              <button className="btn btn-outline-light btn-sm position-relative" onClick={() => setShowNotifications(!showNotifications)}>
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="dropdown-menu dropdown-menu-end show shadow-lg" style={{ width: 360, maxHeight: 400, overflowY: 'auto', right: 0, left: 'auto', position: 'absolute', top: '100%' }}>
                  <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                    <h6 className="mb-0 fw-bold">Notifications</h6>
                    {unreadCount > 0 && <button className="btn btn-link btn-sm p-0" onClick={markAllRead}>Mark all read</button>}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-muted"><i className="fas fa-bell-slash fa-2x mb-2 d-block"></i>No notifications</div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div key={n._id} className={`px-3 py-2 border-bottom ${!n.read ? 'bg-light' : ''}`}>
                        <div className="d-flex gap-2">
                          <i className={`${getNotificationIcon(n.type)} mt-1`}></i>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>{n.title}</div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{n.message}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <span className="text-white-50">|</span>
            <span className="text-white fw-semibold"><i className="fas fa-user me-1"></i>{user?.name}</span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>
              <i className="fas fa-sign-out-alt me-1"></i>Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
