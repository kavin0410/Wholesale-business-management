import { useState, useEffect } from 'react'
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api'

export default function Suppliers({ showToast, refresh }) {
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', address: '' })

    const loadData = () => {
        setLoading(true)
        fetchSuppliers()
            .then(data => setSuppliers(data))
            .catch(err => { console.error(err); showToast('Failed to load suppliers', 'error') })
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadData() }, [])

    const resetForm = () => {
        setForm({ name: '', phone: '', address: '' })
        setEditId(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editId) {
                await updateSupplier(editId, form)
                showToast('Supplier updated successfully', 'success')
            } else {
                await createSupplier(form)
                showToast('Supplier added successfully', 'success')
            }
            resetForm()
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error saving supplier', 'error')
        }
    }

    const handleEdit = (s) => {
        setEditId(s.id)
        setForm({ name: s.name, phone: s.phone || '', address: s.address || '' })
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this supplier?')) return
        try {
            await deleteSupplier(id)
            showToast('Supplier deleted', 'error')
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error deleting supplier', 'error')
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>🏭 Suppliers</h1>
                <p>Manage your supplier network</p>
            </div>

            {/* Form */}
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

            {/* Table */}
            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Supplier List ({suppliers.length})</div>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th><th>Supplier Name</th><th>Phone</th><th>Address</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.length === 0 ? (
                                    <tr><td colSpan={5}>
                                        <div className="empty-state"><div className="empty-icon">🏭</div><p>No suppliers added yet. Add your first supplier above!</p></div>
                                    </td></tr>
                                ) : suppliers.map((s, i) => (
                                    <tr key={s.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{s.name}</strong></td>
                                        <td>{s.phone || '—'}</td>
                                        <td>{s.address || '—'}</td>
                                        <td>
                                            <div className="btn-group">
                                                <button className="btn btn-warning btn-sm" onClick={() => handleEdit(s)}>✏️</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
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
