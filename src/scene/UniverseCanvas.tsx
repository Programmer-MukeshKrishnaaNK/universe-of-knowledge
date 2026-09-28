import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useEffect, useState } from 'react'
import { initWorld } from '../engine/director'
import { universe } from '../graph'
import { profileOf, useSettings } from '../store/settings'
import { ClusterGlows } from './ClusterGlows'
import { Driver } from './Driver'
import { Dust } from './Dust'
import { Edges } from './Edges'
import { Labels } from './Labels'
import { Nebulae } from './Nebulae'
import { Nodes } from './Nodes'
import { Ripples } from './Ripples'
import { Sky } from './Sky'

const compact = typeof window !== 'undefined' && window.innerWidth < 900

/** A counter that ticks (debounced) whenever regions stream in — geometry that depends on the loaded universe rebuilds on it. */
function useUniverseVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const off = universe.onRegion(() => {
      clearTimeout(t)
      t = setTimeout(() => setVersion((v) => v + 1), 600)
    })
    return () => {
      clearTimeout(t)
      off()
    }
  }, [])
  return version
}

export default function UniverseCanvas() {
  // GPU-side state must exist before any scene component renders.
  initWorld()
  const profile = useSettings(profileOf)
  const version = useUniverseVersion()
  const ceiling = Math.min(window.devicePixelRatio || 1, compact ? Math.min(1.6, profile.dpr) : profile.dpr)
  const [shed, setShed] = useState(0)
  const [fx, setFx] = useState(true)
  const dpr = Math.max(1, ceiling - shed)
  useEffect(() => {
    // A new mode is a fresh start for the adaptive fallbacks.
    setShed(0)
    setFx(true)
  }, [profile.mode])

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
          if (dpr > 1.05) setShed((s) => s + 0.35)
          else setFx(false)
        }}
      />
      <Driver />
      <Sky />
      <Nebulae density={profile.nebulae} version={version} />
      {profile.compress && <ClusterGlows version={version} />}
      <Dust profile={profile} version={version} />
      <Edges key={`edges-${profile.mode}`} budget={profile.edgeBudget} segments={profile.edgeSegments} />
      <Nodes profile={profile} />
      <Ripples />
      <Labels key={`labels-${profile.mode}`} poolSize={profile.labels} />
      {fx && profile.bloom !== 'off' ? (
        <EffectComposer key={`fx-${profile.mode}`} multisampling={compact ? 0 : profile.msaa} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.62} luminanceThreshold={0.42} luminanceSmoothing={0.3} radius={0.72} resolutionScale={compact || profile.bloom === 'half' ? 0.5 : 1} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.28} darkness={0.62} />
          <Noise opacity={0.028} blendFunction={BlendFunction.SOFT_LIGHT} />
        </EffectComposer>
      ) : (
        <EffectComposer key="fx-lite" multisampling={0} enableNormalPass={false}>
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.28} darkness={0.62} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
