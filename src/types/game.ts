import { GameStatus, RotationType } from '@prisma/client'

export type Position =
  | 'keeper'
  | 'linksachter'
  | 'rechtsachter'
  | 'midden'
  | 'linksvoor'
  | 'rechtsvoor'
  | 'wissel1'
  | 'wissel2'

export type GameWithDetails = {
  id: string
  date: Date
  duration: number
  status: GameStatus
  gameTime: number
  rotationTime: number
  players: GamePlayerWithDetails[]
  groups: GroupWithDetails[]
}

export type GamePlayerWithDetails = {
  id: string
  gameId: string
  playerId: string
  groupId: string
  isKeeper1: boolean
  isKeeper2: boolean
  currentPosition: string | null
  player: {
    id: string
    name: string
    number: number | null
  }
  group: {
    id: string
    name: string
    positions: string[]
  }
}

export type GroupWithDetails = {
  id: string
  gameId: string
  name: string
  positions: string[]
  players: GamePlayerWithDetails[]
}

export type PositionChange = {
  playerId: string
  fromPosition: string | null
  toPosition: string
}

export type RotationData = {
  id: string
  gameId: string
  timestamp: Date
  gameTime: number
  type: RotationType
  groupId: string | null
  changes: PositionChange[]
}