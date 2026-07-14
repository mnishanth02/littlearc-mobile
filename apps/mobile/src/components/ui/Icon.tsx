import type { ComponentType } from 'react'

export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
export type PhIcon = ComponentType<{ size?: number; color?: string; weight?: IconWeight }>

// Single import site for Phosphor icons across the app.
export * from 'phosphor-react-native'
