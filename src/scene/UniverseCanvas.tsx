import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useState } from 'react'
import { initWorld } from '../engine/director'
import { Driver } from './Driver'
import { Dust } from './Dust'
import { Edges } from './Edges'
import { Labels } from './Labels'
import { Nodes } from './Nodes'
import { Ripples } from './Ripples'
import { Sky } from './Sky'

const compact = typeof window !== 'undefined' && window.innerWidth < 900

export default function UniverseCanvas() {
  // GPU-side state must exist before any scene component renders.
  initWorld()
  const maxDpr = compact ? 1.6 : 1.75
  const [dpr, setDpr] = useState(Math.min(window.devicePixelRatio || 1, maxDpr))
  const [fx, setFx] = useState(true)

  return (
    <Canvas
      className="universe-canvas"
      dpr={dpr}
      flat
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: 50, near: 0.5, far: 12000, position: [0, 400, 1200] }}
      onCreated={({ gl }) => gl.setClearColor('#030409')}
      aria-hidden="true"
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => {
          // Smoothness beats decoration: shed resolution first, then effects.
          if (dpr > 1.05) setDpr((d) => Math.max(1, d - 0.35))
          else setFx(false)
        }}
      />
      <Driver />
      <Sky />
      <Dust />
      <Edges />
      <Nodes />
      <Ripples />
      <Labels />
      {fx ? (
        <EffectComposer multisampling={compact ? 0 : 4} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.62} luminanceThreshold={0.42} luminanceSmoothing={0.3} radius={0.72} resolutionScale={compact ? 0.5 : 1} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.28} darkness={0.62} />
          <Noise opacity={0.028} blendFunction={BlendFunction.SOFT_LIGHT} />
        </EffectComposer>
      ) : (
        <></>
      )}
    </Canvas>
  )
}
