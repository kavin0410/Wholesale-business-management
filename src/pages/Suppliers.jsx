import { useState, useEffect } from 'react'
import { fetchSuppliers, createSupplier, updateSupplierApi, deleteSupplierApi, addNotification, hasPermission } from '../store'

export default function Suppliers({ showToast, refresh, auth }) {
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })

    // RBAC checks
    const canCreate = hasPermission('suppliers:create')
    const canEdit = hasPermission('suppliers:edit')
    const canDelete = hasPermission('suppliers:delete')

    const resetForm = () => {
        setForm({ name: '', phone: '', email: '', address: '' })
        setEditId(null)
    }

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await fetchSuppliers()
            if (res) setSuppliers(res.data)
        } catch (err) {
            console.error('Failed to load suppliers:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (editId && !canEdit) return showToast('⛔ You do not have permission to edit suppliers', 'error')
        if (!editId && !canCreate) return showToast('⛔ You do not have permission to add suppliers', 'error')

        let success = false
        if (editId) {
            success = await updateSupplierApi(editId, form)
            if (success) {
                showToast('Supplier updated successfully', 'success')
                addNotification(`Supplier "${form.name}" updated`, 'info')
            }
        } else {
            success = await createSupplier(form)
            if (success) {
                showToast('Supplier added successfully', 'success')
                addNotification(`New supplier "${form.name}" added`, 'info')
            }
        }

        if (success) {
            resetForm()
            loadData()
        } else {
            showToast('Failed to save supplier', 'error')
        }
    }

    const handleEdit = (s) => {
        if (!canEdit) return showToast('⛔ You do not have permission to edit suppliers', 'error')
        setEditId(s.id)
        setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '' })
    }

    const handleDelete = async (id) => {
        if (!canDelete) return showToast('⛔ You do not have permission to delete suppliers', 'error')
        if (!confirm('Delete this supplier?')) return
        const success = await deleteSupplierApi(id)
        if (success) {
            showToast('Supplier deleted', 'error')
            loadData()
        } else {
            showToast('Failed to delete supplier', 'error')
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>🏭 Suppliers</h1>
                <p>Manage your supplier network</p>
            </div>

            {/* Form — only show for users with create or edit permission */}
            {(canCreate || canEdit) && (
                <div className="card">
                    <div className="card-title">
                        <span className="icon">➕</span> {editId ? 'Edit Supplier' : 'Add New Supplier'}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Supplier Name</label>
                                <input type="text" placeholder="e.g. ABC Distributors" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="text" placeholder="e.g. 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" placeholder="e.g. contact@abc.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" placeholder="e.g. 123 Market Street" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                            </div>
                        </div>
                        <div className="btn-group">
                            <button type="submit" className="btn btn-primary">
                                {editId ? '💾 Update Supplier' : '➕ Add Supplier'}
                            </button>
                            {editId && (
                                <button type="button" className="btn btn-danger" onClick={resetForm}>✖ Cancel</button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Supplier List ({suppliers.length})</div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th><th>Supplier Name</th><th>Phone</th><th>Email</th><th>Address</th>
                                {(canEdit || canDelete) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.length === 0 ? (
                                <tr><td colSpan={(canEdit || canDelete) ? 6 : 5}>
                                    <div className="empty-state"><div className="empty-icon">🏭</div><p>No suppliers added yet. Add your first supplier above!</p></div>
                                </td></tr>
                            ) : suppliers.map((s, i) => (
                                <tr key={s.id}>
                                    <td>{i + 1}</td>
                                    <td><strong>{s.name}</strong></td>
                                    <td>{s.phone || '—'}</td>
                                    <td>{s.email || '—'}</td>
                                    <td>{s.address || '—'}</td>
                                    {(canEdit || canDelete) && (
                                        <td>
                                            <div className="btn-group">
                                                {canEdit && <button className="btn btn-warning btn-sm" onClick={() => handleEdit(s)}>✏️</button>}
                                                {canDelete && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>}
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
