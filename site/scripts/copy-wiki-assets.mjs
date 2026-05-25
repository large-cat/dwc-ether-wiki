import { copyFileSync, cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const wikiDir = join(__dirname, '../../wiki')
const publicDir = join(__dirname, '../public')

// Ensure public directory exists
mkdirSync(publicDir, { recursive: true })

// Merge cache index into growing_knowledge_tree.json for frontend
const tree = JSON.parse(readFileSync(join(wikiDir, 'growing_knowledge_tree.json'), 'utf-8'))
const cache = JSON.parse(readFileSync(join(wikiDir, 'cache.json'), 'utf-8'))
tree.cache = cache
writeFileSync(
  join(publicDir, 'growing_knowledge_tree.json'),
  JSON.stringify(tree, null, 2)
)

// Copy leaves
const leavesSrc = join(wikiDir, 'leaves')
const leavesDst = join(publicDir, 'leaves')
try { rmSync(leavesDst, { recursive: true }) } catch {}
cpSync(leavesSrc, leavesDst, { recursive: true })

// Copy cache
const cacheSrc = join(wikiDir, 'cache')
const cacheDst = join(publicDir, 'cache')
try { rmSync(cacheDst, { recursive: true }) } catch {}
cpSync(cacheSrc, cacheDst, { recursive: true })

console.log('Wiki assets copied to public/')
