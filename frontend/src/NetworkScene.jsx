import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hashToPos } from './utils/hashToPos';

/* ── Device label sprite ───────────────────────────────────────────────────── */

function LabelSprite({ text = '', position = [0, 0.55, 0], scale = 1 }) {
  const meshRef = useRef();

  // Adjust billboard so text always faces camera
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const fontSize = 80;
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px 'Nunito', 'Segoe UI', sans-serif`;
    const metrics = ctx.measureText(text || '');
    const w = Math.ceil(metrics.width) + 24;
    const h = fontSize * 1.5;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(text || '', w / 2, h / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return { texture: tex, aspect: w / h };
  }, [text]);

  return (
    <mesh ref={meshRef} position={position} scale={[0.55 * scale, 0.22 * scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* Per-device 3-D node ─────────────────────────────────────────────────────── */

function NetworkNode({ device }) {
  const meshRef = useRef();
  const ringRef = useRef();

  const isOnline = device.status === 'Online';
  const color = isOnline ? '#10b981' : '#ef4444';
  const emissive = isOnline ? '#075f46' : '#7f1d1d';

  useFrame((_, delta) => {
    // Subtle float on the ring
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.sin(_ /* clock.elapsedTime */) * 0.12;
      ringRef.current.rotation.z += delta * 0.35;
    }
    // Spin the sphere slowly
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.z += delta * 0.18;
    }
  });

  const labelText = device.host || device.ip || '';

  return (
    <group position={device.pos}>
      {/* ── Outer glow ring (torus) ── */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.025, 12, 80]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* ── Inner sphere ── */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.28, 22, 22]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.55}
          roughness={0.20}
          metalness={0.35}
        />
      </mesh>

      {/* ── Rim-light sphere (slightly larger, additive) ── */}
      <mesh position={[0, 0, 0]} scale={1.28}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>

      {/* ── Label ── */}
      <LabelSprite text={labelText} position={[0, 0.88, 0]} />
    </group>
  );
}

/* ── Main Scene ────────────────────────────────────────────────────────────── */

export default function NetworkScene({ devices = [] }) {
  // Build node list (with fallback demo nodes when empty)
  const nodes = useMemo(() => {
    if (!devices || devices.length === 0) {
      const demo = [
        { ip: '10.0.0.1',  host: 'router-gw',   status: 'Online'  },
        { ip: '10.0.0.12', host: 'laptop-john', status: 'Online'  },
        { ip: '10.0.0.55', host: 'tv-lounge',   status: 'Offline' },
        { ip: '10.0.0.90', host: 'nas-storage', status: 'Online'  },
      ];
      return demo.map((d) => ({ ...d, pos: hashToPos(d.ip || d.host) }));
    }
    return devices.map((d) => ({ ...d, pos: hashToPos(d.ip || d.host || String(Math.random())) }));
  }, [devices]);

  // Connection lines — nearest-neighbour per node, hard max 240 dual edges
  const maxEdges = useMemo(() => {
    const maxTotal = 240;   // hard cap so backend scale is bounded
    if (nodes.length < 2) return 0;
    const perNode = Math.min(nodes.length - 1, Math.ceil(maxTotal * 2 / nodes.length));
    return perNode;
  }, [nodes.length]);

  const linePositions = useMemo(() => {
    if (nodes.length < 2) return new Float32Array(0);
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const dists = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].pos[0] - nodes[j].pos[0];
        const dy = nodes[i].pos[1] - nodes[j].pos[1];
        const dz = nodes[i].pos[2] - nodes[j].pos[2];
        dists.push([j, dx * dx + dy * dy + dz * dz]);
      }
      dists.sort((a, b) => a[1] - b[1]);
      for (let k = 0; k < Math.min(dists.length, maxEdges); k++) {
        const j = dists[k][0];
        if (i < j) {
          edges.push(...nodes[i].pos, ...nodes[j].pos);
        }
      }
    }
    return new Float32Array(edges);
  }, [nodes, maxEdges]);

  // Background star particles  (mounted once, never rebuilt)
  const starGeom = useMemo(() => {
    const starPos = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      starPos[i * 3 + 0] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    return geom;
  }, []);

  /* subtle scene fade-in on mount */
  const sceneRef = useRef();
  useFrame(() => {});

  return (
    <>
      {/* ── Background / Fog ──────────────────────────────────────────────── */}
      <color attach="background" args={[0x0a0e1a]} />
      <fog
        attach="fog"
        args={[0x0a0e1a, 3.5, 22]}
      />

      {/* ── Lighting ─────────────────────────────────────────────────────── */}
      <ambientLight intensity={1.2} color="#8899bb" />
      <pointLight
        position={[12, 12, 8]}
        intensity={1.8}
        color="#b8ccff"
        distance={40}
        decay={2}
      />
      <pointLight
        position={[-12, -5, -10]}
        intensity={0.65}
        color="#00d4ff"
        distance={28}
        decay={2}
      />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.4}
        color="#ffffff"
      />

      {/* ── Star particles ───────────────────────────────────────────────── */}
      <points geometry={starGeom}>
        <pointsMaterial
          color="#8899cc"
          size={0.045}
          transparent
          opacity={0.45}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* ── Subtle grid floor ─────────────────────────────────────────────── */}
      <gridHelper
        args={[42, 42, '#141a30', '#141a30']}
        position={[0, -4, 0]}
      />

      {/* ── Network nodes ───────────────────────────────────────────────── */}
      {nodes.map((n, i) => (
        <NetworkNode
          key={(n.ip || n.host || 'node') + '-' + i}
          device={n}
        />
      ))}

      {/* ── Connection lines ─────────────────────────────────────────────── */}
      {linePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach={['attributes', 'position']}
              array={linePositions}
              count={linePositions.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          {/* Base dim line */}
          <lineBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}
    </>
  );
}
