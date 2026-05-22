/**
 * Scene3D — Tách hoàn toàn khỏi App.jsx để không đánh crash khi khởi tạo.
 * Chỉ được import và mount KHI NGƯỜI DÙNG CHỌN 3D.
 *
 * Nếu @react-three/fiber lỗi ở đây → ErrorBoundary của App bắt được,
 * App vẫn chạy bình thường ở 2D.
 */
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import NetworkScene from './NetworkScene';
import SafeScene from './SafeScene';

export default function Scene3D({ devices, useSafeScene }) {
  return (
    <Suspense fallback={<div style={{ color: '#4e5f7a', padding: 16 }}>Đang tải 3D…</div>}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        onCreated={(state) => {
          try {
            console.info('WebGL renderer created', {
              glCap: state.gl.getContextAttributes?.(),
            });
          } catch (e) {
            console.error('[Scene3D] GL init error', e);
          }
        }}
        camera={{ position: [0, 2, 8], fov: 45 }}
      >
        {useSafeScene ? <SafeScene /> : <NetworkScene devices={devices} />}
      </Canvas>
    </Suspense>
  );
}
