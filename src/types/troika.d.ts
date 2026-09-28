declare module 'troika-three-text' {
  import type { Mesh, Material } from 'three'
  /** Minimal typing for the SDF text mesh we use from troika-three-text. */
  export class Text extends Mesh {
    text: string
    font: string
    fontSize: number
    letterSpacing: number
    anchorX: 'left' | 'center' | 'right' | number
    anchorY: 'top' | 'middle' | 'bottom' | number
    color: string | number
    fillOpacity: number
    material: Material & { depthTest: boolean; depthWrite: boolean; toneMapped: boolean }
    sync(callback?: () => void): void
    dispose(): void
  }
}
