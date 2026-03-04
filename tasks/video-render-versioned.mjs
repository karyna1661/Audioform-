import { mkdirSync } from "node:fs"
import { spawnSync } from "node:child_process"

function stamp() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const hh = String(now.getHours()).padStart(2, "0")
  const mi = String(now.getMinutes()).padStart(2, "0")
  const ss = String(now.getSeconds()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}-${hh}${mi}${ss}`
}

const outDir = "out/demo-versions"
mkdirSync(outDir, { recursive: true })

const target = `${outDir}/audioform-build-demo-${stamp()}.mp4`
console.log(`Rendering versioned demo to ${target}`)

const args = [
  "render",
  "remotion/index.ts",
  "AudioformBuildDemo",
  target,
  "--codec=h264",
  "--crf=18",
]

const result = spawnSync("remotion", args, { stdio: "inherit", shell: true })

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

console.log(`Done: ${target}`)
