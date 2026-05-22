import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function SafeScene() {
  const mesh = useRef()
  useFrame(() => {
    if (mesh.current) mesh.current.rotation.y += 0.01
  })
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} />
      <mesh ref={mesh} position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={'#00d4ff'} />
      </mesh>
    </>
  )
}
