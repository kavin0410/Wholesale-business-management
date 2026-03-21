import { useRef, useState, useEffect } from 'react'
import { 
    exportBackup, 
    importBackup, 
    hasPermission, 
    fetchStaffs, 
    createStaff, 
    updateStaff, 
    deleteStaff,
    fetchAllPerformance
} from '../store'
import { generateStaffPerformanceReport } from '../utils/exportUtils'

export default function Settings({ showToast, refresh, auth }) {
    const fileRef = useRef(null)
    const [staffs, setStaffs] = useState([])
    const [performance, setPerformance] = useState([])
    const [loading, setLoading] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ username: '', password: '', name: '', email: '', phone: '', address: '' })

    const canView = hasPermission('settings:view')
    const canEdit = hasPermission('settings:edit')
    const canManageStaff = hasPermission('staff:view')

    useEffect(() => {
        if (canManageStaff) {
            loadStaffData()
        }
    }, [canManageStaff])

    const loadStaffData = async () => {
        setLoading(true)
        try {
            const { data } = await fetchStaffs()
            const perf = await fetchAllPerformance()
            setStaffs(data)
            setPerformance(perf)
        } catch (err) {
            showToast('Failed to load staff data', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleStaffSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            let success = false
            if (editId) {
                success = await updateStaff(editId, form)
                if (success) showToast('Staff updated successfully', 'success')
            } else {
                success = await createStaff(form)
                if (success) showToast('Staff account created', 'success')
            }
            if (success) {
                setEditId(null)
                setForm({ username: '', password: '', name: '', email: '', phone: '', address: '' })
                loadStaffData()
            } else {
                showToast('Action failed', 'error')
            }
        } catch (err) {
            showToast('Error saving staff', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (s) => {
        setEditId(s.id)
        setForm({ username: s.username, password: '', name: s.name || '', email: s.email || '', phone: s.phone || '', address: s.address || '' })
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this staff account?')) return
        const success = await deleteStaff(id)
        if (success) {
            showToast('Staff deleted', 'error')
            loadStaffData()
        }
    }

    const handleBackup = () => {
        if (!canEdit) return showToast('⛔ You do not have permission to export data', 'error')
        exportBackup()
        showToast('Backup downloaded!', 'success')
    }

    const handleRestore = async () => {
        if (!canEdit) return showToast('⛔ You do not have permission to restore data', 'error')
        const file = fileRef.current?.files?.[0]
        if (!file) return fileRef.current?.click()
        try {
            await importBackup(file)
            showToast('Data restored successfully!', 'success')
            refresh()
        } catch {
            showToast('Failed to restore data', 'error')
        }
    }

    if (!canView) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <h1>Settings</h1>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to access settings. Contact your administrator.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Settings</h1>
                <p>Manage staff, backup/restore, and application preferences</p>
            </div>

            {canManageStaff && (
                <div className="staff-management-section">
                    <div className="card">
                        <div className="card-title"><span className="icon">👥</span> {editId ? 'Edit Staff' : 'Add New Staff'}</div>
                        <form onSubmit={handleStaffSubmit} className="form-grid">
                            <input type="text" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required disabled={!!editId} />
                            <input type="password" placeholder={editId ? "New Password (optional)" : "Password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editId} />
                            <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                            <input type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            <input type="text" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                            <div className="btn-group">
                                <button type="submit" className="btn btn-primary" disabled={loading}>{editId ? 'Update Staff' : 'Add Staff'}</button>
                                {editId && <button type="button" className="btn btn-danger" onClick={() => {setEditId(null); setForm({username:'', password:'', name:'', email:'', phone:'', address:''})}}>Cancel</button>}
                            </div>
                        </form>
                    </div>

                    <div className="card" style={{ marginTop: '24px' }}>
                        <div className="card-title"><span className="icon">📋</span> Staff List & Performance Summary</div>
                        <div style={{ marginBottom: 14 }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => generateStaffPerformanceReport(staffs, performance)}
                            >
                                📄 Export Staff Performance PDF
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th><th>Username</th><th>Email</th><th>Orders</th><th>Sales</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffs.map(s => {
                                        const p = performance.find(x => x.staff_id === s.id) || {}
                                        return (
                                            <tr key={s.id}>
                                                <td><strong>{s.name}</strong></td>
                                                <td>{s.username}</td>
                                                <td>{s.email}</td>
                                                <td><span className="status-badge status-delivered">{p.total_orders || 0}</span></td>
                                                <td>₹{(p.total_sales_amount || 0).toLocaleString()}</td>
                                                <td>
                                                    <div className="btn-group">
                                                        <button className="btn btn-warning btn-sm" onClick={() => handleEdit(s)}>✏️</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <div className="settings-grid" style={{ marginTop: '24px' }}>
                <div className="card">
                    <div className="card-title"><span className="icon">💾</span> Backup Data</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                        Export all your data as a JSON file. Keep it safe for future restoration.
                    </p>
                    <button className="btn btn-primary" onClick={handleBackup}>📥 Download Backup</button>
                </div>
                <div className="card">
                    <div className="card-title"><span className="icon">📤</span> Restore Data</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                        Import a previously exported JSON backup file to restore all data.
                    </p>
                    <input
                        type="file"
                        ref={fileRef}
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleRestore}
                    />
                    <button className="btn btn-success" onClick={() => fileRef.current?.click()}>📤 Import Backup</button>
                </div>
            </div>
        </div>
    )
}
