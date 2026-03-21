import { useState } from 'react'

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const [loading, setLoading] = useState(false)
 
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (loading) return
        setError('')
        setLoading(true)
        try {
            const result = await onLogin(username, password)
            if (!result) setError('Invalid username or password')
        } catch (err) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <div className="login-logo-container">
                        <div className="login-logo-glow" />
                        <div className="login-logo-mark" role="img" aria-label="SupplyNest Logo" />
                    </div>
                    <h1>
                        SupplyNest
                        <span>Wholesale Business Management</span>
                    </h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label htmlFor="loginUsername">Username</label>
                        <input
                            type="text"
                            id="loginUsername"
                            placeholder="Enter username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label htmlFor="loginPassword">Password</label>
                        <input
                            type="password"
                            id="loginPassword"
                            placeholder="Enter password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 16, opacity: loading ? 0.7 : 1 }}
                        disabled={loading}
                    >
                        {loading ? '⏳ Authenticating...' : '🔐 Sign In'}
                    </button>

                </form>
            </div>
        </div>
    )
}
