import { useState, useEffect } from 'react'
import { fetchProducts, fetchSuppliers, createProduct, updateProduct, deleteProduct } from '../api'

export default function Products({ showToast, formatCurrency, refresh }) {
    const [products, setProducts] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', category: '', cost_price: '', price: '', stock: '', supplier_id: '' })

    const categories = ['Grains & Cereals', 'Dairy Products', 'Beverages', 'Snacks', 'Spices', 'Canned Goods', 'Personal Care', 'Cleaning Supplies', 'Electronics', 'Stationery', 'Other']

    const loadData = () => {
        setLoading(true)
        Promise.all([fetchProducts(), fetchSuppliers()])
            .then(([p, s]) => { setProducts(p); setSuppliers(s) })
            .catch(err => { console.error(err); showToast('Failed to load products', 'error') })
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadData() }, [])

    const resetForm = () => {
        setForm({ name: '', category: '', cost_price: '', price: '', stock: '', supplier_id: '' })
        setEditId(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const body = {
            name: form.name,
            category: form.category,
            cost_price: Number(form.cost_price),
            price: Number(form.price),
            stock: Number(form.stock),
            supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        }
        try {
            if (editId) {
                await updateProduct(editId, body)
                showToast('Product updated successfully', 'success')
            } else {
                await createProduct(body)
                showToast('Product added successfully', 'success')
            }
            resetForm()
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error saving product', 'error')
        }
    }

    const handleEdit = (p) => {
        setEditId(p.id)
        setForm({
            name: p.name,
            category: p.category,
            cost_price: String(p.cost_price),
            price: String(p.price),
            stock: String(p.stock),
            supplier_id: String(p.supplier_id || ''),
        })
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return
        try {
            await deleteProduct(id)
            showToast('Product deleted', 'error')
            loadData()
            refresh()
        } catch (err) {
            showToast(err.message || 'Error deleting product', 'error')
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Products</h1>
                <p>Manage your product inventory</p>
            </div>

            {/* Form */}
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
                            <input type="number" placeholder="0.00" min="0" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} required />
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
                            <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} required>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="btn-group">
                        <button type="submit" className="btn btn-primary">
                            {editId ? '💾 Update Product' : '➕ Add Product'}
                        </button>
                        {editId && (
                            <button type="button" className="btn btn-danger" onClick={resetForm}>✖ Cancel</button>
                        )}
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="card">
                <div className="card-title"><span className="icon">📋</span> Product List</div>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th><th>Product Name</th><th>Category</th><th>Cost Price</th>
                                    <th>Sell Price</th><th>Profit/Unit</th><th>Stock</th><th>Supplier</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr><td colSpan={9}>
                                        <div className="empty-state"><div className="empty-icon">📦</div><p>No products added yet.</p></div>
                                    </td></tr>
                                ) : products.map((p, i) => (
                                    <tr key={p.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{p.name}</strong></td>
                                        <td>{p.category}</td>
                                        <td>{formatCurrency(p.cost_price)}</td>
                                        <td>{formatCurrency(p.price)}</td>
                                        <td className="text-success">{formatCurrency(p.price - p.cost_price)}</td>
                                        <td><span className={`status-badge ${p.stock <= 10 ? 'status-pending' : 'status-delivered'}`}>{p.stock}</span></td>
                                        <td>{p.supplier_name || '—'}</td>
                                        <td>
                                            <div className="btn-group">
                                                <button className="btn btn-warning btn-sm" onClick={() => handleEdit(p)}>✏️</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
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
