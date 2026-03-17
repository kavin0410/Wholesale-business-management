import { useRef } from 'react'
import { exportBackup, importBackup, hasPermission } from '../store'

export default function Settings({ showToast, refresh, auth }) {
    const fileRef = useRef(null)

    const canView = hasPermission('settings:view')
    const canEdit = hasPermission('settings:edit')

    const handleBackup = () => {
        if (!canEdit) return showToast('⛔ You do not have permission to export data', 'error')
        exportBackup()
        showToast('Backup downloaded!', 'success')
    }

    const handleRestore = async () => {
        if (!canEdit) return showToast('⛔ You do not have permission to restore data', 'error')
        const file = fileRef.current?.files?.[0]
        if (!file) return fileRef.current?.click()
        try {
            await importBackup(file)
            showToast('Data restored successfully!', 'success')
            refresh()
        } catch {
            showToast('Failed to restore data', 'error')
        }
    }

    // Staff should never reach this page (blocked at nav level),
    // but just in case, show access denied
    if (!canView) {
        return (
            <div className="page-enter">
                <div className="page-header">
                    <h1>Settings</h1>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to access settings. Contact your administrator.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1>Settings</h1>
                <p>Backup, restore, and application preferences</p>
            </div>

            <div className="settings-grid">
                <div className="card">
                    <div className="card-title"><span className="icon">💾</span> Backup Data</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                        Export all your data as a JSON file. Keep it safe for future restoration.
                    </p>
                    <button className="btn btn-primary" onClick={handleBackup}>📥 Download Backup</button>
                </div>
                <div className="card">
                    <div className="card-title"><span className="icon">📤</span> Restore Data</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                        Import a previously exported JSON backup file to restore all data.
                    </p>
                    <input
                        type="file"
                        ref={fileRef}
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleRestore}
                    />
                    <button className="btn btn-success" onClick={() => fileRef.current?.click()}>📤 Import Backup</button>
                </div>
            </div>
        </div>
    )
}
