import { useState } from 'react'

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        const result = onLogin(username, password)
        if (!result) setError('Invalid username or password')
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <div className="brand-icon-lg">SN</div>
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
                        style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 16 }}
                    >
                        🔐 Sign In
                    </button>

                    <div className="login-hint">
                        <p>Admin: <strong>admin / admin123</strong></p>
                        <p>Staff: <strong>staff / staff123</strong></p>
                    </div>
                </form>
            </div>
        </div>
    )
}
