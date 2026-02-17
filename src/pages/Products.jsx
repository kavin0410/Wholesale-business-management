import { useState } from 'react'
import { getProducts, saveProducts, getSuppliers, nextId, addNotification } from '../store'

export default function Products({ showToast, formatCurrency, refresh }) {
    const [products, setProducts] = useState(getProducts())
    const suppliers = getSuppliers()
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', category: '', costPrice: '', price: '', stock: '', supplierId: '' })

    const categories = ['Grains & Cereals', 'Dairy Products', 'Beverages', 'Snacks', 'Spices', 'Canned Goods', 'Personal Care', 'Cleaning Supplies', 'Electronics', 'Stationery', 'Other']

    const resetForm = () => {
        setForm({ name: '', category: '', costPrice: '', price: '', stock: '', supplierId: '' })
        setEditId(null)
    }

    const reload = () => { setProducts(getProducts()); refresh() }

    const handleSubmit = (e) => {
        e.preventDefault()
        const data = getProducts()
        const supplierName = suppliers.find(s => s.id === Number(form.supplierId))?.name || ''
        if (editId) {
            const idx = data.findIndex(p => p.id === editId)
            if (idx >= 0) {
                data[idx] = { ...data[idx], name: form.name, category: form.category, costPrice: Number(form.costPrice), price: Number(form.price), stock: Number(form.stock), supplierId: Number(form.supplierId), supplierName }
                saveProducts(data)
                showToast('Product updated successfully', 'success')
                addNotification(`Product "${form.name}" updated`, 'info')
            }
        } else {
            const newProd = {
                id: nextId(data), name: form.name, category: form.category, costPrice: Number(form.costPrice),
                price: Number(form.price), stock: Number(form.stock), supplierId: Number(form.supplierId), supplierName
            }
            data.push(newProd)
            saveProducts(data)
            showToast('Product added successfully', 'success')
            addNotification(`New product "${form.name}" added`, 'stock')
        }
        resetForm()
        reload()
    }

    const handleEdit = (p) => {
        setEditId(p.id)
        setForm({ name: p.name, category: p.category, costPrice: String(p.costPrice), price: String(p.price), stock: String(p.stock), supplierId: String(p.supplierId || '') })
    }

    const handleDelete = (id) => {
        if (!confirm('Delete this product?')) return
        const data = getProducts().filter(p => p.id !== id)
        saveProducts(data)
        showToast('Product deleted', 'error')
        reload()
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
                                    <td>{formatCurrency(p.costPrice)}</td>
                                    <td>{formatCurrency(p.price)}</td>
                                    <td className="text-success">{formatCurrency(p.price - p.costPrice)}</td>
                                    <td><span className={`status-badge ${p.stock <= 10 ? 'status-pending' : 'status-delivered'}`}>{p.stock}</span></td>
                                    <td>{p.supplierName}</td>
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
            </div>
        </div>
    )
}
