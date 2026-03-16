import { useState, useEffect } from 'react'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api'

export default function Customers({ showToast, refresh }) {
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', address: '' })

    const loadData = () => {
        setLoading(true)
        fetchCustomers()
            .then(data => setCustomers(data))
            .catch(err => { console.error(err); showToast('Failed to load customers', 'error') })
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadData() }, [])

    const resetForm = () => { setForm({ name: '', phone: '', address: '' }); setEditId(null) }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editId) {
                await updateCustomer(editId, form)
                showToast('Customer updated', 'success')
            } else {
                await createCustomer(form)
                showToast('Customer added', 'success')
            }
            resetForm()
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error saving customer', 'error')
        }
    }

    const handleEdit = (c) => {
        setEditId(c.id)
        setForm({ name: c.name, phone: c.phone || '', address: c.address || '' })
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this customer?')) return
        try {
            await deleteCustomer(id)
            showToast('Customer deleted', 'error')
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error deleting customer', 'error')
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Customers</h1>
                <p>Manage your customer base</p>
            </div>

            <div className="card">
                <div className="card-title"><span className="icon">➕</span> {editId ? 'Edit Customer' : 'Add New Customer'}</div>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Customer / Business Name</label>
                            <input type="text" placeholder="e.g. Metro Mart" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input type="tel" placeholder="e.g. +91 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Address</label>
                            <input type="text" placeholder="e.g. 42 Commercial St, Mumbai" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                        </div>
                    </div>
                    <div className="btn-group">
                        <button type="submit" className="btn btn-primary">{editId ? '💾 Update' : '➕ Add Customer'}</button>
                        {editId && <button type="button" className="btn btn-danger" onClick={resetForm}>✖ Cancel</button>}
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="card-title"><span className="icon">👥</span> Customer List</div>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead>
                            <tbody>
                                {customers.length === 0 ? (
                                    <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">👥</div><p>No customers added yet.</p></div></td></tr>
                                ) : customers.map((c, i) => (
                                    <tr key={c.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{c.name}</strong></td>
                                        <td>{c.phone}</td>
                                        <td>{c.address}</td>
                                        <td>
                                            <div className="btn-group">
                                                <button className="btn btn-warning btn-sm" onClick={() => handleEdit(c)}>✏️</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
