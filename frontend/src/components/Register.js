import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student', studentId: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const user = await register(formData);
      toast.success('Account created successfully!');
      navigate(user.role === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center py-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="bg-success bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 70, height: 70 }}>
                    <i className="fas fa-user-plus fa-2x text-white"></i>
                  </div>
                  <h2 className="fw-bold">Create Account</h2>
                  <p className="text-muted">Join Smart Attendance System</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input type="text" className="form-control" placeholder="John Doe" value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email Address</label>
                    <input type="email" className="form-control" placeholder="you@example.com" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Password</label>
                    <input type="password" className="form-control" placeholder="At least 6 characters" value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">I am a...</label>
                    <div className="d-flex gap-3">
                      {['student', 'teacher'].map(r => (
                        <div key={r} className={`flex-fill p-3 border rounded-3 text-center cursor-pointer ${formData.role === r ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                          style={{ cursor: 'pointer' }} onClick={() => setFormData({ ...formData, role: r })}>
                          <i className={`fas ${r === 'student' ? 'fa-user-graduate' : 'fa-chalkboard-teacher'} fa-2x mb-2 ${formData.role === r ? 'text-primary' : 'text-muted'}`}></i>
                          <div className={`fw-semibold ${formData.role === r ? 'text-primary' : 'text-muted'}`}>{r.charAt(0).toUpperCase() + r.slice(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {formData.role === 'student' && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Student ID (Optional)</label>
                      <input type="text" className="form-control" placeholder="e.g. STU2024001" value={formData.studentId}
                        onChange={e => setFormData({ ...formData, studentId: e.target.value })} />
                    </div>
                  )}
                  <button type="submit" className="btn btn-success w-100 py-2 fw-semibold mt-2" disabled={loading}>
                    {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating account...</> : 'Create Account'}
                  </button>
                </form>

                <hr className="my-4" />
                <div className="text-center">
                  <p className="mb-0">Already have an account? <Link to="/login" className="text-primary fw-semibold">Sign in</Link></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
