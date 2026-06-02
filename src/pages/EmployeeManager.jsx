import React, { useEffect, useState } from 'react';
import { RefreshCw, Save, Shield, UserPlus } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const STORE_LABELS = {
  sabeel: 'Sabeel Elrashad',
  clouds_tex: 'Clouds Tex',
};

const ROLE_LABELS = {
  sabeel_employee: 'Sabeel Employee',
  clouds_tex_employee: 'Clouds Tex Employee',
};

const emptyForm = {
  username: '',
  password: '',
  displayName: '',
  role: 'sabeel_employee',
};

const EmployeeManager = () => {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordDrafts, setPasswordDrafts] = useState({});

  const token = localStorage.getItem('adminToken');

  const request = async (path, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
    return data;
  };

  const loadEmployees = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await request('/api/employees');
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const createEmployee = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await request('/api/employees', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm(emptyForm);
      setMessage('Employee account created.');
      await loadEmployees();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateEmployee = async (employee, updates) => {
    setMessage('');
    try {
      const updated = await request(`/api/employees/${employee._id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setEmployees(prev => prev.map(item => item._id === updated._id ? updated : item));
      setMessage('Employee account updated.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const resetPassword = async (employee) => {
    const password = passwordDrafts[employee._id];
    if (!password || password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    setMessage('');
    try {
      await request(`/api/employees/${employee._id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
      setPasswordDrafts(prev => ({ ...prev, [employee._id]: '' }));
      setMessage('Password reset successfully.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="bg-white" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1E1023', fontSize: 22, fontWeight: 800 }}>Employee Accounts</h2>
            <p style={{ margin: '6px 0 0', color: '#6B4A6E', fontSize: 13 }}>
              Create, disable, and manage store salesperson access.
            </p>
          </div>
          <button
            onClick={loadEmployees}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #f9a8d4', background: '#FFF0F6', color: '#BE185D', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        {message && (
          <div style={{ marginTop: 14, padding: 11, borderRadius: 10, background: '#FFF0F6', color: '#6B4A6E', border: '1px solid #FCE7F3', fontSize: 13 }}>
            {message}
          </div>
        )}
      </div>

      <form onSubmit={createEmployee} className="bg-white" style={{ padding: 22, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1E1023', fontWeight: 800 }}>
          <UserPlus size={18} />
          New Employee
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          <input
            value={form.username}
            onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Username"
            required
            style={inputStyle}
          />
          <input
            value={form.displayName}
            onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="Display name"
            style={inputStyle}
          />
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Password"
            required
            style={inputStyle}
          />
          <select
            value={form.role}
            onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
            style={inputStyle}
          >
            <option value="sabeel_employee">Sabeel Employee</option>
            <option value="clouds_tex_employee">Clouds Tex Employee</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 'fit-content', border: 'none', background: 'linear-gradient(135deg, #BE185D, #9d174d)', color: '#fff', borderRadius: 10, padding: '11px 16px', fontWeight: 800, cursor: 'pointer' }}
        >
          <Save size={16} />
          {saving ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      <div className="bg-white" style={{ padding: 22 }}>
        {loading ? (
          <div style={{ color: '#6B4A6E' }}>Loading employees...</div>
        ) : employees.length === 0 ? (
          <div style={{ color: '#6B4A6E' }}>No employee accounts yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  {['Employee', 'Store', 'Status', 'Last Login', 'Role', 'Password Reset', 'Actions'].map(label => (
                    <th key={label} style={thStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee._id} style={{ borderTop: '1px solid #FCE7F3' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 800, color: '#1E1023' }}>{employee.displayName || employee.username}</div>
                      <div style={{ color: '#6B4A6E', fontSize: 12 }}>{employee.username}</div>
                    </td>
                    <td style={tdStyle}>{STORE_LABELS[employee.store] || employee.store}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        padding: '5px 10px',
                        fontSize: 12,
                        fontWeight: 800,
                        background: employee.isActive ? '#dcfce7' : '#fee2e2',
                        color: employee.isActive ? '#166534' : '#991b1b',
                      }}>
                        <Shield size={13} />
                        {employee.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={employee.role}
                        onChange={e => updateEmployee(employee, { role: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="sabeel_employee">{ROLE_LABELS.sabeel_employee}</option>
                        <option value="clouds_tex_employee">{ROLE_LABELS.clouds_tex_employee}</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="password"
                          value={passwordDrafts[employee._id] || ''}
                          onChange={e => setPasswordDrafts(prev => ({ ...prev, [employee._id]: e.target.value }))}
                          placeholder="New password"
                          style={{ ...inputStyle, minWidth: 150 }}
                        />
                        <button onClick={() => resetPassword(employee)} style={secondaryButtonStyle}>Reset</button>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => updateEmployee(employee, { isActive: !employee.isActive })}
                        style={{
                          ...secondaryButtonStyle,
                          background: employee.isActive ? '#fee2e2' : '#dcfce7',
                          color: employee.isActive ? '#991b1b' : '#166534',
                          borderColor: employee.isActive ? '#fecaca' : '#bbf7d0',
                        }}
                      >
                        {employee.isActive ? 'Disable' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  border: '1px solid #FCE7F3',
  borderRadius: 10,
  padding: '10px 12px',
  color: '#1E1023',
  background: '#fff',
  outline: 'none',
};

const thStyle = {
  textAlign: 'left',
  padding: '11px 10px',
  color: '#6B4A6E',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const tdStyle = {
  padding: '12px 10px',
  color: '#1E1023',
  fontSize: 13,
  verticalAlign: 'middle',
};

const secondaryButtonStyle = {
  border: '1px solid #FCE7F3',
  background: '#FFF0F6',
  color: '#BE185D',
  borderRadius: 10,
  padding: '9px 12px',
  fontWeight: 800,
  cursor: 'pointer',
};

export default EmployeeManager;
