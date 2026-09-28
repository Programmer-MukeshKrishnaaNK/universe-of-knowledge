/**
 * Uniform spatial hash over node positions. Radius and nearest queries touch
 * only the cells that can contain an answer, so "what is near here?" costs
 * the same in a 100-node universe and a 50,000-node one.
 */
export class SpatialGrid {
  private cells = new Map<number, number[]>()
  private where = new Map<number, number>()

  constructor(readonly cellSize = 24) {}

  private key(x: number, y: number, z: number) {
    const s = this.cellSize
    // Cell coordinates packed into one safe integer (±32k cells per axis, < 2^53).
    return ((Math.floor(x / s) + 32768) * 65536 + (Math.floor(y / s) + 32768)) * 65536 + (Math.floor(z / s) + 32768)
  }

  insert(i: number, x: number, y: number, z: number) {
    this.remove(i)
    const k = this.key(x, y, z)
    const cell = this.cells.get(k)
    if (cell) cell.push(i)
    else this.cells.set(k, [i])
    this.where.set(i, k)
  }

  remove(i: number) {
    const k = this.where.get(i)
    if (k === undefined) return
    const cell = this.cells.get(k)!
    const at = cell.indexOf(i)
    if (at >= 0) cell.splice(at, 1)
    if (!cell.length) this.cells.delete(k)
    this.where.delete(i)
  }

  /** Bulk insert from a positions array (xyz per node). */
  insertAll(positions: Float32Array, indices: Iterable<number>) {
    for (const i of indices) this.insert(i, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
  }

  /** Visit every node within `r` of (x, y, z). Return false from `visit` to stop early. */
  query(positions: Float32Array, x: number, y: number, z: number, r: number, visit: (i: number, d2: number) => boolean | void) {
    const s = this.cellSize
    const r2 = r * r
    const x0 = Math.floor((x - r) / s), x1 = Math.floor((x + r) / s)
    const y0 = Math.floor((y - r) / s), y1 = Math.floor((y + r) / s)
    const z0 = Math.floor((z - r) / s), z1 = Math.floor((z + r) / s)
    // Wide queries: walking occupied cells is cheaper than probing empty ones.
    if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > this.cells.size) {
      for (const cell of this.cells.values())
        for (const i of cell) {
          const dx = positions[i * 3] - x, dy = positions[i * 3 + 1] - y, dz = positions[i * 3 + 2] - z
          const d2 = dx * dx + dy * dy + dz * dz
          if (d2 <= r2 && visit(i, d2) === false) return
        }
      return
    }
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++)
        for (let cz = z0; cz <= z1; cz++) {
          const cell = this.cells.get(((cx + 32768) * 65536 + (cy + 32768)) * 65536 + (cz + 32768))
          if (!cell) continue
          for (const i of cell) {
            const dx = positions[i * 3] - x, dy = positions[i * 3 + 1] - y, dz = positions[i * 3 + 2] - z
            const d2 = dx * dx + dy * dy + dz * dz
            if (d2 <= r2 && visit(i, d2) === false) return
          }
        }
  }

  /** The k nearest nodes within `maxR`. */
  nearest(positions: Float32Array, x: number, y: number, z: number, k: number, maxR: number): number[] {
    const found: [number, number][] = []
    this.query(positions, x, y, z, maxR, (i, d2) => {
      found.push([i, d2])
    })
    return found.sort((a, b) => a[1] - b[1]).slice(0, k).map((f) => f[0])
  }

  get size() {
    return this.where.size
  }
}
