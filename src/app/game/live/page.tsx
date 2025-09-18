'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  number: number | null;
  active: boolean;
}

interface MatchState {
  selectedPlayers: Player[];
  keeper1: Player | null;
  keeper2: Player | null;
  group1: Player[];
  group2: Player[];
  group1Positions: string[];
  group2Positions: string[];
  currentKeeper: 1 | 2;
  substitutionCount: number;
  matchTime: number; // in seconds
  substitutionTime: number; // in seconds
  isMatchRunning: boolean;
  isSubstitutionRunning: boolean;
  half: 1 | 2;
}

interface SubstitutionPlan {
  outPlayer: Player;
  inPlayer: Player;
  group: 1 | 2;
}

export default function LiveMatchPage() {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const matchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const substitutionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load match setup from localStorage
    const savedMatch = localStorage.getItem('currentMatch');
    if (savedMatch) {
      try {
        const setup = JSON.parse(savedMatch);
        setMatchState({
          selectedPlayers: setup.selectedPlayers,
          keeper1: setup.keeper1,
          keeper2: setup.keeper2,
          group1: setup.group1,
          group2: setup.group2,
          group1Positions: setup.group1Positions,
          group2Positions: setup.group2Positions,
          currentKeeper: 1,
          substitutionCount: 0,
          matchTime: 0,
          substitutionTime: 0,
          isMatchRunning: false,
          isSubstitutionRunning: false,
          half: 1
        });
      } catch (e) {
        console.error('Failed to load match setup:', e);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (matchState?.isMatchRunning) {
      matchIntervalRef.current = setInterval(() => {
        setMatchState(prev => prev ? {
          ...prev,
          matchTime: prev.matchTime + 1
        } : null);
      }, 1000);
    } else {
      if (matchIntervalRef.current) {
        clearInterval(matchIntervalRef.current);
        matchIntervalRef.current = null;
      }
    }

    return () => {
      if (matchIntervalRef.current) {
        clearInterval(matchIntervalRef.current);
      }
    };
  }, [matchState?.isMatchRunning]);

  useEffect(() => {
    if (matchState?.isSubstitutionRunning) {
      substitutionIntervalRef.current = setInterval(() => {
        setMatchState(prev => prev ? {
          ...prev,
          substitutionTime: prev.substitutionTime + 1
        } : null);
      }, 1000);
    } else {
      if (substitutionIntervalRef.current) {
        clearInterval(substitutionIntervalRef.current);
        substitutionIntervalRef.current = null;
      }
    }

    return () => {
      if (substitutionIntervalRef.current) {
        clearInterval(substitutionIntervalRef.current);
      }
    };
  }, [matchState?.isSubstitutionRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMatchTimer = () => {
    if (!matchState) return;

    setMatchState(prev => prev ? {
      ...prev,
      isMatchRunning: !prev.isMatchRunning,
      isSubstitutionRunning: prev.isMatchRunning ? false : prev.isSubstitutionRunning
    } : null);
  };

  const getNextSubstitution = (): SubstitutionPlan | null => {
    if (!matchState) return null;

    // Determine which group should substitute next
    const group1OnField = matchState.group1.filter(p => p.id !== matchState.keeper2?.id).slice(0, 3);
    const group1Subs = matchState.group1.filter(p => p.id !== matchState.keeper2?.id).slice(3);

    const group2OnField = matchState.group2.slice(0, 3);
    const group2Subs = matchState.group2.slice(3);

    // Alternate between groups or use other logic
    const isGroup1Turn = matchState.substitutionCount % 2 === 0;

    if (isGroup1Turn && group1Subs.length > 0) {
      return {
        outPlayer: group1OnField[matchState.substitutionCount % group1OnField.length],
        inPlayer: group1Subs[0],
        group: 1
      };
    } else if (!isGroup1Turn && group2Subs.length > 0) {
      return {
        outPlayer: group2OnField[matchState.substitutionCount % group2OnField.length],
        inPlayer: group2Subs[0],
        group: 2
      };
    }

    return null;
  };

  const executeSubstitution = () => {
    const nextSub = getNextSubstitution();
    if (!nextSub || !matchState) return;

    // Check if this is the 4th substitution (half-time)
    const newSubCount = matchState.substitutionCount + 1;
    const isHalfTime = newSubCount === 4;

    setMatchState(prev => {
      if (!prev) return null;

      let newState = {
        ...prev,
        substitutionCount: newSubCount,
        substitutionTime: 0,
        isSubstitutionRunning: prev.isMatchRunning
      };

      // Perform the substitution logic here
      if (nextSub.group === 1) {
        const newGroup1 = [...prev.group1];
        const outIndex = newGroup1.findIndex(p => p.id === nextSub.outPlayer.id);
        const inIndex = newGroup1.findIndex(p => p.id === nextSub.inPlayer.id);

        if (outIndex !== -1 && inIndex !== -1) {
          [newGroup1[outIndex], newGroup1[inIndex]] = [newGroup1[inIndex], newGroup1[outIndex]];
          newState.group1 = newGroup1;
        }
      } else {
        const newGroup2 = [...prev.group2];
        const outIndex = newGroup2.findIndex(p => p.id === nextSub.outPlayer.id);
        const inIndex = newGroup2.findIndex(p => p.id === nextSub.inPlayer.id);

        if (outIndex !== -1 && inIndex !== -1) {
          [newGroup2[outIndex], newGroup2[inIndex]] = [newGroup2[inIndex], newGroup2[outIndex]];
          newState.group2 = newGroup2;
        }
      }

      // Handle half-time
      if (isHalfTime) {
        newState = {
          ...newState,
          half: 2,
          currentKeeper: prev.currentKeeper === 1 ? 2 : 1
        };
        alert(`Rust! Keepers wisselen: ${prev.currentKeeper === 1 ? prev.keeper2?.name : prev.keeper1?.name} gaat keepen in de 2e helft.`);
      }

      return newState;
    });
  };

  const startHalfTime = () => {
    if (!matchState) return;

    setMatchState(prev => prev ? {
      ...prev,
      half: 2,
      currentKeeper: prev.currentKeeper === 1 ? 2 : 1,
      substitutionTime: 0
    } : null);

    alert(`2e helft! ${matchState.currentKeeper === 1 ? matchState.keeper2?.name : matchState.keeper1?.name} gaat nu keepen.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Wedstrijd laden...</div>
      </div>
    );
  }

  if (!matchState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-4">Geen wedstrijd gevonden</div>
          <Link href="/game/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Nieuwe Wedstrijd Maken
          </Link>
        </div>
      </div>
    );
  }

  const nextSub = getNextSubstitution();
  const currentKeeper = matchState.currentKeeper === 1 ? matchState.keeper1 : matchState.keeper2;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-lg border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-bold text-sm sm:text-lg">
                ← Home
              </Link>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Live Wedstrijd - {matchState.half}e Helft
              </h1>
            </div>
            <div className="text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
              Wissel #{matchState.substitutionCount}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-3 px-3 sm:py-6 sm:px-6 lg:px-8">
        {/* Timers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Match Timer */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">⏱️ Wedstrijdtijd</h2>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-4">
                {formatTime(matchState.matchTime)}
              </div>
              <button
                onClick={toggleMatchTimer}
                className={`px-6 py-3 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
                  matchState.isMatchRunning
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {matchState.isMatchRunning ? '⏸️ Pauzeren' : '▶️ Starten'}
              </button>
            </div>
          </div>

          {/* Substitution Timer */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">🔄 Wisselperiode</h2>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-4">
                {formatTime(matchState.substitutionTime)}
              </div>
              <div className="text-sm text-gray-600">
                {matchState.isSubstitutionRunning ? 'Loopt mee...' : 'Gepauzeerd'}
              </div>
            </div>
          </div>
        </div>

        {/* Current Keeper */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-bold text-blue-800 mb-2">🥅 Huidige Keeper</h3>
          <div className="text-xl font-bold text-blue-900">
            {currentKeeper?.name} ({matchState.half}e helft)
          </div>
        </div>

        {/* Next Substitution */}
        {nextSub && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-yellow-800 mb-3">⏭️ Volgende Wissel</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Uit</div>
                  <div className="font-bold text-red-600">⬇️ {nextSub.outPlayer.name}</div>
                </div>
                <div className="text-2xl">↔️</div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">In</div>
                  <div className="font-bold text-green-600">⬆️ {nextSub.inPlayer.name}</div>
                </div>
                <div className="text-sm text-gray-500">
                  (Groep {nextSub.group})
                </div>
              </div>
              <button
                onClick={executeSubstitution}
                className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 font-bold shadow-lg transition-all transform hover:scale-105"
              >
                🔄 Wissel Nu!
              </button>
            </div>
          </div>
        )}

        {/* Half-time Button */}
        {matchState.half === 1 && (
          <div className="text-center mb-6">
            <button
              onClick={startHalfTime}
              className="bg-orange-600 text-white px-8 py-4 rounded-lg hover:bg-orange-700 font-bold shadow-lg transition-all transform hover:scale-105"
            >
              🏃‍♂️ Start 2e Helft (Wissel Keepers)
            </button>
          </div>
        )}

        {/* Quick Field Overview */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">⚽ Huidige Opstelling</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
              <h4 className="font-bold text-blue-800 mb-2">🔵 Groep 1 - Op het veld</h4>
              {matchState.group1.filter(p => p.id !== matchState.keeper2?.id).slice(0, 3).map(player => (
                <div key={player.id} className="text-sm font-medium text-blue-900">
                  • {player.name}
                </div>
              ))}
            </div>
            <div className="bg-green-50 border border-green-300 rounded-lg p-3">
              <h4 className="font-bold text-green-800 mb-2">🔴 Groep 2 - Op het veld</h4>
              {matchState.group2.slice(0, 3).map(player => (
                <div key={player.id} className="text-sm font-medium text-green-900">
                  • {player.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}