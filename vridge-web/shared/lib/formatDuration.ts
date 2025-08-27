/**
 * 일수를 기반으로 기간을 포맷하는 유틸리티 함수
 * @param days - 일수
 * @param phase - 단계 이름 (기획, 촬영, 편집 등)
 * @returns 포맷된 기간 문자열
 * 
 * @example
 * formatDuration(5, '기획') // '기획 5일'
 * formatDuration(7, '기획') // '기획 1주'
 * formatDuration(10, '기획') // '기획 10일' (7의 배수가 아님)
 * formatDuration(14, '편집') // '편집 2주'
 */
export const formatDuration = (days: number, phase: string): string => {
  if (days < 7) {
    return `${phase} ${days}일`
  }
  
  // 7일 이상인 경우, 7의 배수가 아니면 일 단위로 표시
  if (days % 7 !== 0) {
    return `${phase} ${days}일`
  }
  
  const weeks = Math.floor(days / 7)
  return `${phase} ${weeks}주`
}