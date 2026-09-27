import { Vector3 } from 'three'

export interface Ripple {
  position: Vector3
  size: number
  /** 0 = selection response (quick, bright), 1 = arrival (slow, soft). */
  kind: number
  age: number
  life: number
  active: boolean
}

const POOL = 6

/** Tiny fixed pool of expanding rings — the universe acknowledging a choice. */
export const ripples = {
  items: Array.from({ length: POOL }, (): Ripple => ({ position: new Vector3(), size: 1, kind: 0, age: 0, life: 1, active: false })),
  spawn(position: Vector3, size: number, kind: number) {
    const slot = this.items.find((r) => !r.active) ?? this.items.reduce((a, b) => (a.age / a.life > b.age / b.life ? a : b))
    slot.position.copy(position)
    slot.size = size
    slot.kind = kind
    slot.age = 0
    slot.life = kind === 0 ? 1.1 : 2.4
    slot.active = true
  },
}
