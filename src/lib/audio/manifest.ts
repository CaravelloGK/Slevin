export const AUDIO = {
  TWENTY_MINUTES: '20-minutes',
  FIVE_MINUTES: '5-minutes',
  ONE_MINUTE: '1-minute',
  BEEP: 'beep',
  BEEP_FINAL: 'beep-final',
  CHIP_UP: 'chip-up',
  FINAL_TABLE: 'final-table',
  TIME_TO_EAT: 'timetoeat',
} as const

export type AudioFileName = typeof AUDIO[keyof typeof AUDIO]

export function levelAudioFile(levelNumber: number): string {
  return `level-${levelNumber}`
}
