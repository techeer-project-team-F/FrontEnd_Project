export interface CameraOption {
  id: string
  label: string
}

// 라벨 휴리스틱 — 브라우저마다 표기가 달라 best-effort. 권한 부여 후 label이 채워질 때 동작.
const FRONT_RE = /front|전면|selfie|셀피/i
const BACK_RE = /back|rear|후면|environment/i

/**
 * videoinput 목록을 바코드 스캔 드롭다운용 옵션으로 변환한다.
 *
 * 안드로이드 멀티렌즈폰은 후면(광각/초광각/망원)·전면 렌즈를 각각 별개 카메라로 노출해
 * 드롭다운이 4개까지 떠 혼란스럽다. 바코드 스캔에 전면은 무의미하므로 전면을 제외하고
 * 후면만 남긴다. 단 전면 판정에 전부 걸려 후보가 비면(데스크탑 웹캠 등 facing 미표기)
 * 원본을 그대로 써서 카메라 선택 기능 자체가 사라지지 않게 한다(회귀 방지).
 *
 * 라벨은 후면으로 인식된 장치에만 순번을 매긴다(첫 후면 `(기본)`, 이후 `(보조)`).
 * 브라우저가 렌즈 종류(광각/초광각)를 노출하지 않으므로 "기본"은 "첫 후면" 의미일 뿐
 * 메인 광각임을 단정하지 않는다. 인식 안 된 장치는 원 label을 유지한다.
 */
export function buildCameraOptions(devices: MediaDeviceInfo[]): CameraOption[] {
  // 빈 deviceId(권한 직후 일부 브라우저)는 select key/value 충돌 방지 위해 제외
  const withId = devices.filter(d => d.deviceId)
  const nonFront = withId.filter(d => !FRONT_RE.test(d.label))
  const visible = nonFront.length > 0 ? nonFront : withId

  const backIds = visible.filter(d => BACK_RE.test(d.label)).map(d => d.deviceId)
  const numberSuffix = backIds.length >= 3 // 후면 3개 이상일 때만 보조에 번호 부여

  return visible.map((d, idx) => {
    const backPos = backIds.indexOf(d.deviceId)
    let label: string
    if (backPos === 0) {
      label = '후면 카메라 (기본)'
    } else if (backPos > 0) {
      label = numberSuffix ? `후면 카메라 (보조 ${backPos})` : '후면 카메라 (보조)'
    } else {
      label = d.label || `카메라 ${idx + 1}`
    }
    return { id: d.deviceId, label }
  })
}
