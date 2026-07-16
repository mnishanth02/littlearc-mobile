import { CheckCircle, Clock, Info, WarningCircle } from 'phosphor-react-native'
import type { PhIcon } from './Icon'

export type StatusKind = 'success' | 'dueSoon' | 'overdue' | 'info'
export type StatusToneKey = 'success' | 'warning' | 'danger' | 'info'
export interface StatusSpec {
  toneKey: StatusToneKey
  icon: PhIcon
  defaultLabel: string
}

export const STATUS: Record<StatusKind, StatusSpec> = {
  success: { toneKey: 'success', icon: CheckCircle, defaultLabel: 'Up to date' },
  dueSoon: { toneKey: 'warning', icon: Clock, defaultLabel: 'Due soon' },
  overdue: { toneKey: 'danger', icon: WarningCircle, defaultLabel: 'Overdue' },
  info: { toneKey: 'info', icon: Info, defaultLabel: 'Info' },
}
