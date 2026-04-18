import { useState, useEffect } from 'react'
import {
    fetchProducts,
    createProduct,
    updateProductApi,
    deleteProductApi,
    getSuppliers,
    addNotification,
    hasPermission
} from '../store'

export default function Products({ showToast, formatCurrency, refresh: refreshApp, auth }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [suppliers, setSuppliers] = useState(getSuppliers())
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', category: '', costPrice: '', price: '', stock: '', supplierId: '' })

    const categories = ['Grains & Cereals', 'Dairy Products', 'Beverages', 'Snacks', 'Spices', 'Canned Goods', 'Personal Care', 'Cleaning Supplies', 'Electronics', 'Stationery', 'Other']

    // RBAC checks
    const canCreate = hasPermission('products:create')
    const canEdit = hasPermission('products:edit')
    const canDelete = hasPermission('products:delete')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const { data } = await fetchProducts()
            setProducts(data)
        } catch (err) {
            showToast('Failed to load products', 'error')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setForm({ name: '', category: '', costPrice: '', price: '', stock: '', supplierId: '' })
        setEditId(null)
    }

    const reload = () => { loadData(); refreshApp() }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (editId && !canEdit) return showToast('⛔ You do not have permission to edit products', 'error')
        if (!editId && !canCreate) return showToast('⛔ You do not have permission to add products', 'error')

        setLoading(true)
        try {
            // Map to backend snake_case
            const payload = {
                name: form.name,
                category: form.category,
                cost_price: Number(form.costPrice),
                price: Number(form.price),
                stock: Number(form.stock),
                supplier_id: form.supplierId ? Number(form.supplierId) : null
            }

            let success = false
            if (editId) {
                success = await updateProductApi(editId, payload)
                if (success) {
                    showToast('Product updated successfully', 'success')
                    addNotification(`Product "${form.name}" updated`, 'info')
                }
            } else {
                success = await createProduct(payload)
                if (success) {
                    showToast('Product added successfully', 'success')
                    addNotification(`New product "${form.name}" added`, 'stock')
                }
            }

            if (success) {
                resetForm()
                reload()
            } else {
                showToast('Failed to save product', 'error')
            }
        } catch (err) {
            showToast('Error saving product', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (p) => {
        if (!canEdit) return showToast('⛔ You do not have permission to edit products', 'error')
        setEditId(p.id)
        setForm({
            name: p.name,
            category: p.category,
            costPrice: String(p.costPrice || p.cost_price || ''),
            price: String(p.price || ''),
            stock: String(p.stock || ''),
            supplierId: String(p.supplierId || p.supplier_id || '')
        })
    }

    const handleDelete = async (id) => {
        if (!canDelete) return showToast('⛔ You do not have permission to delete products', 'error')
        if (!confirm('Delete this product?')) return

        setLoading(true)
        try {
            const success = await deleteProductApi(id)
            if (success) {
                showToast('Product deleted', 'error')
                reload()
            } else {
                showToast('Failed to delete product', 'error')
            }
        } catch (err) {
            showToast('Error deleting product', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Products</h1>
                <p>Manage your product inventory</p>
            </div>

            {/* Form — only show for users with create or edit permission */}
            {(canCreate || canEdit) && (
                <div className="card">
                    <div className="card-title">
                        <span className="icon">➕</span> {editId ? 'Edit Product' : 'Add New Product'}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Product Name</label>
                                <input type="text" placeholder="e.g. Basmati Rice 25kg" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cost Price (₹)</label>
                                <input type="number" placeholder="0.00" min="0" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Selling Price (₹)</label>
                                <input type="number" placeholder="0.00" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Stock Quantity</label>
                                <input type="number" placeholder="0" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Supplier</label>
                                <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} required>
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="btn-group">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? '⏳ Processing...' : (editId ? '💾 Update Product' : '➕ Add Product')}
                            </button>
                            {editId && (
                                <button type="button" className="btn btn-danger" onClick={resetForm} disabled={loading}>✖ Cancel</button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="card" style={{ position: 'relative' }}>
                {loading && !products.length && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>Loading products...</p>
                    </div>
                )}
                <div className="card-title"><span className="icon">📋</span> Product List</div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th><th>Product Name</th><th>Category</th><th>Cost Price</th>
                                <th>Sell Price</th><th>Profit/Unit</th><th>Stock</th><th>Supplier</th>
                                {(canEdit || canDelete) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr><td colSpan={(canEdit || canDelete) ? 9 : 8}>
                                    <div className="empty-state"><div className="empty-icon">📦</div><p>No products added yet.</p></div>
                                </td></tr>
                            ) : products.map((p, i) => (
                                <tr key={p.id}>
                                    <td>{i + 1}</td>
                                    <td><strong>{p.name}</strong></td>
                                    <td>{p.category}</td>
                                    <td>{formatCurrency(p.costPrice)}</td>
                                    <td>{formatCurrency(p.price)}</td>
                                    <td className="text-success">{formatCurrency(p.price - p.costPrice)}</td>
                                    <td><span className={`status-badge ${p.stock <= 10 ? 'status-pending' : 'status-delivered'}`}>{p.stock}</span></td>
                                    <td>{p.supplierName}</td>
                                    {(canEdit || canDelete) && (
                                        <td>
                                            <div className="btn-group">
                                                {canEdit && <button className="btn btn-warning btn-sm" onClick={() => handleEdit(p)}>✏️</button>}
                                                {canDelete && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>}
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
