const BASE_URL = 'http://localhost:8000/api'

/**
 * Common fetch utility with error handling and headers for SupplyNest.
 */
async function apiRequest(endpoint, options = {}) {
    // Get auth from localStorage (managed by store.js)
    const authRaw = localStorage.getItem('wbms_auth')
    let auth = null
    try { auth = JSON.parse(authRaw) } catch (e) { auth = null }

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    }

    // Include RBAC headers if logged in
    if (auth && auth.id) {
        headers['X-User-Id'] = auth.id.toString()
        headers['X-User-Role'] = auth.role
    }

    const config = {
        ...options,
        headers
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config)
        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.detail || result.message || 'Something went wrong')
        }

        return result
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error)
        throw error
    }
}

export const api = {
    get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
}
