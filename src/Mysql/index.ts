import { createPool, Pool } from 'mysql2/promise'
import { BufferJSON, initAuthCreds, fromObject } from '../Utils'
import { MySQLConfig, sqlData, AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '../Types'

let pool: Pool

async function initPool(config: MySQLConfig, force: boolean = false) {
  if (!pool || force) {
    pool = createPool({
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user || 'root',
      password: config.password,
      database: config.database || 'base',
      waitForConnections: true,
      connectionLimit: config.connectionLimit || 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 5000,
      ssl: config.ssl,
      localAddress: config.localAddress,
      socketPath: config.socketPath,
      insecureAuth: config.insecureAuth || false,
      // 'isServer' isn't supported by Pool, skip or handle separately if needed
    })

    // Ensure auth table exists
    const tableName = config.tableName || 'auth'
    await pool.execute(
      `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        \`session\` varchar(50) NOT NULL,
        \`id\` varchar(80) NOT NULL,
        \`value\` json DEFAULT NULL,
        UNIQUE KEY \`idxunique\` (\`session\`,\`id\`),
        KEY \`idxsession\` (\`session\`),
        KEY \`idxid\` (\`id\`)
      ) ENGINE=InnoDB;`
    )
  }
  return pool
}

export const useMySQLAuthState = async (
  config: MySQLConfig
): Promise<{
  state: AuthenticationState,
  saveCreds: () => Promise<void>,
  clear: () => Promise<void>,
  removeCreds: () => Promise<void>,
  query: (sql: string, values: any[]) => Promise<sqlData>
}> => {
  const db = await initPool(config)
  const tableName = config.tableName || 'auth'
  const retryDelay = config.retryRequestDelayMs || 200
  const maxTries = config.maxtRetries || 10

  const query = async (sql: string, values: any[]) => {
    for (let i = 0; i < maxTries; i++) {
      try {
        const [rows] = await db.query(sql, values)
        return rows as sqlData
      } catch (err) {
        await new Promise((res) => setTimeout(res, retryDelay))
      }
    }
    return [] as sqlData
  }

  const readData = async (id: string) => {
    const data = await query(
      `SELECT value FROM ${tableName} WHERE id = ? AND session = ?`,
      [id, config.session]
    )
    if (!data[0]?.value) return null

    const serialized =
      typeof data[0].value === 'object'
        ? JSON.stringify(data[0].value)
        : data[0].value
    return JSON.parse(serialized, BufferJSON.reviver)
  }

  const writeData = async (id: string, value: object) => {
    const serialized = JSON.stringify(value, BufferJSON.replacer)
    await query(
      `INSERT INTO ${tableName} (session, id, value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE value = ?`,
      [config.session, id, serialized, serialized]
    )
  }

  const removeData = async (id: string) => {
    await query(
      `DELETE FROM ${tableName} WHERE id = ? AND session = ?`,
      [id, config.session]
    )
  }

  const clearAll = async () => {
    await query(
      `DELETE FROM ${tableName} WHERE id != 'creds' AND session = ?`,
      [config.session]
    )
  }

  const removeAll = async () => {
    await query(
      `DELETE FROM ${tableName} WHERE session = ?`,
      [config.session]
    )
  }

  const creds: AuthenticationCreds =
    (await readData('creds')) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result: { [id: string]: SignalDataTypeMap[typeof type] } = {}
          for (const id of ids) {
            let val = await readData(`${type}-${id}`)
            if (type === 'app-state-sync-key' && val) val = fromObject(val)
            result[id] = val
          }
          return result
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              const val = data[category][id]
              const key = `${category}-${id}`
              if (val) await writeData(key, val)
              else await removeData(key)
            }
          }
        }
      }
    },
    saveCreds: async () => writeData('creds', creds),
    clear: clearAll,
    removeCreds: removeAll,
    query
  }
}
