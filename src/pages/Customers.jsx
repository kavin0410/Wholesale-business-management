import { useState, useEffect } from 'react'
import { fetchCustomers, createCustomer, updateCustomerApi, deleteCustomerApi, addNotification, hasPermission } from '../store'

export default function Customers({ showToast, refresh, auth }) {
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })

    // RBAC checks
    const canCreate = hasPermission('customers:create')
    const canEdit = hasPermission('customers:edit')
    const canDelete = hasPermission('customers:delete')

    const resetForm = () => { setForm({ name: '', phone: '', email: '', address: '' }); setEditId(null) }
    
    const loadData = async () => {
        setLoading(true)
        const res = await fetchCustomers()
        setCustomers(res.data)
        setLoading(false)
        refresh()
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (editId && !canEdit) return showToast('⛔ You do not have permission to edit customers', 'error')
        if (!editId && !canCreate) return showToast('⛔ You do not have permission to add customers', 'error')

        let success = false
        if (editId) {
            success = await updateCustomerApi(editId, form)
            if (success) showToast('Customer updated', 'success')
        } else {
            success = await createCustomer(form)
            if (success) {
                showToast('Customer added', 'success')
                addNotification(`New customer "${form.name}" added`, 'info')
            }
        }

        if (success) {
            resetForm()
            loadData()
        } else {
            showToast('Failed to save customer', 'error')
        }
    }

    const handleEdit = (c) => {
        if (!canEdit) return showToast('⛔ You do not have permission to edit customers', 'error')
        setEditId(c.id)
        setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address })
    }

    const handleDelete = async (id) => {
        if (!canDelete) return showToast('⛔ You do not have permission to delete customers', 'error')
        if (!confirm('Delete this customer?')) return
        const success = await deleteCustomerApi(id)
        if (success) {
            showToast('Customer deleted', 'error')
            loadData()
        } else {
            showToast('Failed to delete customer', 'error')
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Customers</h1>
                <p>Manage your customer base</p>
            </div>

            {/* Form — only show for users with create or edit permission */}
            {(canCreate || canEdit) && (
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
                                <label>Email</label>
                                <input type="email" placeholder="e.g. orders@metromart.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
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
            )}

            <div className="card">
                <div className="card-title"><span className="icon">👥</span> Customer List</div>
                <div className="table-wrapper">
                    <table>
                        <thead><tr>
                            <th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Address</th>
                            {(canEdit || canDelete) && <th>Actions</th>}
                        </tr></thead>
                        <tbody>
                            {customers.length === 0 ? (
                                <tr><td colSpan={(canEdit || canDelete) ? 6 : 5}><div className="empty-state"><div className="empty-icon">👥</div><p>No customers added yet.</p></div></td></tr>
                            ) : customers.map((c, i) => (
                                <tr key={c.id}>
                                    <td>{i + 1}</td>
                                    <td><strong>{c.name}</strong></td>
                                    <td>{c.phone}</td>
                                    <td>{c.email}</td>
                                    <td>{c.address}</td>
                                    {(canEdit || canDelete) && (
                                        <td>
                                            <div className="btn-group">
                                                {canEdit && <button className="btn btn-warning btn-sm" onClick={() => handleEdit(c)}>✏️</button>}
                                                {canDelete && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
