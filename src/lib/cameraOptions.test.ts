import { describe, expect, it } from 'vitest'

import { buildCameraOptions } from './cameraOptions'

// MediaDeviceInfo 최소 형태 — buildCameraOptions는 deviceId/label만 사용
function cam(deviceId: string, label: string): MediaDeviceInfo {
  return {
    deviceId,
    label,
    kind: 'videoinput',
    groupId: 'g',
    toJSON: () => ({}),
  } as MediaDeviceInfo
}

describe('buildCameraOptions', () => {
  it('후면 2 + 전면 2 → 후면만, (기본)/(보조)', () => {
    const opts = buildCameraOptions([
      cam('back0', 'camera 0, facing back'),
      cam('front1', 'camera 1, facing front'),
      cam('back2', 'camera 2, facing back'),
      cam('front3', 'camera 3, facing front'),
    ])
    expect(opts).toEqual([
      { id: 'back0', label: '후면 카메라 (기본)' },
      { id: 'back2', label: '후면 카메라 (보조)' },
    ])
  })

  it('후면 1 + 전면 1 → 후면 1개(기본)만 (드롭다운은 length<2로 숨겨짐)', () => {
    const opts = buildCameraOptions([
      cam('back0', 'camera 0, facing back'),
      cam('front1', 'camera 1, facing front'),
    ])
    expect(opts).toEqual([{ id: 'back0', label: '후면 카메라 (기본)' }])
  })

  it('후면 3개 → 기본/보조 1/보조 2', () => {
    const opts = buildCameraOptions([
      cam('b0', 'camera 0, facing back'),
      cam('b1', 'camera 1, facing back'),
      cam('b2', 'camera 2, facing back'),
    ])
    expect(opts.map(o => o.label)).toEqual([
      '후면 카메라 (기본)',
      '후면 카메라 (보조 1)',
      '후면 카메라 (보조 2)',
    ])
  })

  it('데스크탑(facing 정보 없는 웹캠) → 전부 유지 + 원 label', () => {
    const opts = buildCameraOptions([cam('w0', 'Integrated Webcam'), cam('w1', 'USB Camera')])
    expect(opts).toEqual([
      { id: 'w0', label: 'Integrated Webcam' },
      { id: 'w1', label: 'USB Camera' },
    ])
  })

  it('빈 deviceId는 제외', () => {
    const opts = buildCameraOptions([
      cam('', 'camera 0, facing back'),
      cam('back2', 'camera 2, facing back'),
    ])
    expect(opts).toEqual([{ id: 'back2', label: '후면 카메라 (기본)' }])
  })

  it('전부 전면이면 안전장치로 원본 유지(선택 기능 소실 방지)', () => {
    const opts = buildCameraOptions([
      cam('f0', 'camera 0, facing front'),
      cam('f1', 'camera 1, facing front'),
    ])
    expect(opts).toEqual([
      { id: 'f0', label: 'camera 0, facing front' },
      { id: 'f1', label: 'camera 1, facing front' },
    ])
  })
})
