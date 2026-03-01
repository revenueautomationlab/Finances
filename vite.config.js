
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const DB_PATH = resolve('db.json')

const defaultData = { projects: [], bankSpending: [], charitySpending: [] }

function readDB() {
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2))
    return defaultData
  }
  try { return JSON.parse(readFileSync(DB_PATH, 'utf-8')) }
  catch { return defaultData }
}

function dbPlugin() {
  return {
    name: 'db-plugin',
    configureServer(server) {
      server.middlewares.use('/api/data', (req, res) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(readDB()))
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              writeFileSync(DB_PATH, JSON.stringify(JSON.parse(body), null, 2))
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid JSON' }))
            }
          })
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), dbPlugin()]
})
