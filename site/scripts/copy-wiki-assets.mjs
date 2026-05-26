import { copyFileSync, cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const wikiDir = join(__dirname, '../../wiki')
const publicDir = join(__dirname, '../public')

// Ensure public directory exists
mkdirSync(publicDir, { recursive: true })

// Copy growing_knowledge_tree.json to public
copyFileSync(
  join(wikiDir, 'growing_knowledge_tree.json'),
  join(publicDir, 'growing_knowledge_tree.json')
)

// Copy leaves
const leavesSrc = join(wikiDir, 'leaves')
const leavesDst = join(publicDir, 'leaves')
try { rmSync(leavesDst, { recursive: true }) } catch {}
cpSync(leavesSrc, leavesDst, { recursive: true })

console.log('Wiki assets copied to public/')
