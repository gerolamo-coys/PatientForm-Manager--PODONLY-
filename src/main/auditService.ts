import { getDb, runQuery } from './database'

/**
 * Initializes the audit_logs table if it doesn't exist
 */
export function initAuditLogsTable(): void {
  const db = getDb()
  if (!db) return

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

/**
 * Logs an important action to the database.
 * Never log sensitive data (like passwords, patient names, notes) in 'details' or 'target'.
 */
export function logAction(actor: string, action: string, target: string = '', details: string = ''): void {
  try {
    runQuery(
      'INSERT INTO audit_logs (actor, action, target, details) VALUES (?, ?, ?, ?)',
      [actor, action, target, details]
    )
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

/**
 * Retrieves the most recent audit logs (admin only).
 */
export function getAuditLogs(limit: number = 100) {
  const db = getDb()
  if (!db) return []

  try {
    const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?')
    return stmt.all(limit)
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    return []
  }
}
