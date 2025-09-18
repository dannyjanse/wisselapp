import { create } from 'zustand'
import { GameWithDetails, Position } from '@/types/game'

interface GameState {
  currentGame: GameWithDetails | null
  timer: {
    gameTime: number
    rotationTime: number
    isRunning: boolean
  }
  positions: Record<Position, string | null>

  // Actions
  setCurrentGame: (game: GameWithDetails | null) => void
  updateTimer: (gameTime: number, rotationTime: number) => void
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  updatePosition: (position: Position, playerId: string | null) => void
  swapPositions: (pos1: Position, pos2: Position) => void
}

export const useGameStore = create<GameState>((set) => ({
  currentGame: null,
  timer: {
    gameTime: 0,
    rotationTime: 300, // 5 minuten in seconden
    isRunning: false,
  },
  positions: {
    keeper: null,
    linksachter: null,
    rechtsachter: null,
    midden: null,
    linksvoor: null,
    rechtsvoor: null,
    wissel1: null,
    wissel2: null,
  },

  setCurrentGame: (game) => set({ currentGame: game }),

  updateTimer: (gameTime, rotationTime) =>
    set((state) => ({
      timer: { ...state.timer, gameTime, rotationTime },
    })),

  startTimer: () =>
    set((state) => ({
      timer: { ...state.timer, isRunning: true },
    })),

  pauseTimer: () =>
    set((state) => ({
      timer: { ...state.timer, isRunning: false },
    })),

  resetTimer: () =>
    set((state) => ({
      timer: { ...state.timer, gameTime: 0, rotationTime: 300, isRunning: false },
    })),

  updatePosition: (position, playerId) =>
    set((state) => ({
      positions: { ...state.positions, [position]: playerId },
    })),

  swapPositions: (pos1, pos2) =>
    set((state) => {
      const newPositions = { ...state.positions }
      const temp = newPositions[pos1]
      newPositions[pos1] = newPositions[pos2]
      newPositions[pos2] = temp
      return { positions: newPositions }
    }),
}))