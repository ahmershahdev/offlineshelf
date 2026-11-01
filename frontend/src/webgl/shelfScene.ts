import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

import fragmentShader from './shelf.frag?raw'
import vertexShader from './shelf.vert?raw'

export type ShelfScene = { dispose: () => void }

type Options = {
  canvas: HTMLCanvasElement
  /** 0 = scattered cloud, 1 = ordered shelves. Read every frame. */
  progress: () => number
  animate: boolean
}

const ROWS = 7
const SPINE_WIDTH = 0.062
const SPINE_GAP = 0.018
const ROW_HEIGHT = 1.12

// Deterministic so the first frame matches on every load (and in screenshots).
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0 // NOSONAR: 32-bit wraparound for the PRNG, not truncation
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildGeometry(cols: number): InstancedBufferGeometry {
  const count = cols * ROWS
  const base = new BoxGeometry(SPINE_WIDTH, 1, 0.62)
  const geometry = new InstancedBufferGeometry()
  geometry.index = base.index
  geometry.setAttribute('position', base.getAttribute('position'))
  geometry.setAttribute('normal', base.getAttribute('normal'))
  geometry.instanceCount = count

  const scatter = new Float32Array(count * 3)
  const shelf = new Float32Array(count * 3)
  const rand = new Float32Array(count * 4)
  const height = new Float32Array(count)
  const rnd = mulberry32(20270214)
  const rowWidth = cols * (SPINE_WIDTH + SPINE_GAP)

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    const h = 0.55 + rnd() * 0.38
    height[i] = h

    shelf[i * 3] = -rowWidth / 2 + col * (SPINE_WIDTH + SPINE_GAP)
    shelf[i * 3 + 1] = (ROWS / 2 - row - 1) * ROW_HEIGHT + h / 2
    shelf[i * 3 + 2] = (rnd() - 0.5) * 0.04

    // A wide, shallow cloud: more spread in x than y so it reads on a landscape screen.
    const r = 1.5 + Math.cbrt(rnd()) * 7
    const theta = rnd() * Math.PI * 2
    const phi = Math.acos(2 * rnd() - 1)
    scatter[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.25
    scatter[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.62
    scatter[i * 3 + 2] = r * Math.cos(phi) * 0.6 - 4

    rand[i * 4] = rnd()
    rand[i * 4 + 1] = rnd()
    rand[i * 4 + 2] = rnd()
    rand[i * 4 + 3] = rnd()
  }

  geometry.setAttribute('aScatter', new InstancedBufferAttribute(scatter, 3))
  geometry.setAttribute('aShelf', new InstancedBufferAttribute(shelf, 3))
  geometry.setAttribute('aRand', new InstancedBufferAttribute(rand, 4))
  geometry.setAttribute('aHeight', new InstancedBufferAttribute(height, 1))
  base.dispose()
  return geometry
}

export function createShelfScene({ canvas, progress, animate }: Options): ShelfScene {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))

  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.1, 60)
  camera.position.set(0, 0, 10.5)

  const narrow = window.innerWidth < 720
  const geometry = buildGeometry(narrow ? 64 : 120)
  const uniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0, 0) },
    uPaper: { value: new Color('#ece6da') },
    uInk: { value: new Color('#0b0b0a') },
    uSignal: { value: new Color('#ff5a1f') },
    uTorch: { value: new Vector3(0, 0, 3) },
    uTorchPower: { value: animate ? 2.4 : 0 },
  }
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)

  const mouse = new Vector2(0, 0)
  const onPointer = (e: PointerEvent): void => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
  }

  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = canvas
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // Pull back on portrait screens so the shelf still fits across.
    camera.position.z = camera.aspect < 1 ? 10.5 / Math.max(camera.aspect, 0.55) : 10.5
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  let visible = true
  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
  })
  io.observe(canvas)

  let frame = 0
  let smoothed = progress()
  const start = performance.now()
  let last = start

  const render = (): void => {
    const now = performance.now()
    // Exponential smoothing by elapsed time, so the easing feels the same at 30, 60 or 120 Hz.
    const dt = Math.min((now - last) / 1000, 0.25)
    last = now
    smoothed += (progress() - smoothed) * (1 - Math.exp(-dt * 4.5))
    uniforms.uProgress.value = smoothed
    uniforms.uTime.value = (now - start) / 1000
    uniforms.uMouse.value.lerp(mouse, 1 - Math.exp(-dt * 3))
    camera.position.x = uniforms.uMouse.value.x * 0.35
    camera.position.y = uniforms.uMouse.value.y * 0.2
    camera.lookAt(0, 0, 0)
    const depth = camera.position.z - 3
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * depth
    uniforms.uTorch.value.set(mouse.x * halfH * camera.aspect, mouse.y * halfH, 3)
    renderer.render(scene, camera)
  }

  const loop = (): void => {
    frame = requestAnimationFrame(loop)
    if (visible && !document.hidden) render()
  }

  if (animate) {
    window.addEventListener('pointermove', onPointer, { passive: true })
    loop()
  } else {
    uniforms.uProgress.value = 0.35
    render()
  }

  return {
    dispose: () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointer)
      observer.disconnect()
      io.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}
