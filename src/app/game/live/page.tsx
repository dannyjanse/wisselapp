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
  matchTime: number; // in seconds
  isMatchRunning: boolean;
  half: 1 | 2;
  executedSubstitutions: number[];
}

interface Substitution {
  id: number;
  outPlayer: Player;
  inPlayer: Player;
  group: 1 | 2;
  timing: string;
  executed: boolean;
}

export default function LiveMatchPage() {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapMode, setSwapMode] = useState<{active: boolean, firstPlayer: {playerId: string, position: string, group: number} | null}>({
    active: false,
    firstPlayer: null
  });
  const matchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load match setup from localStorage
    const savedMatch = localStorage.getItem('currentMatch');
    if (savedMatch) {
      try {
        const setup = JSON.parse(savedMatch);
        const initialState = {
          selectedPlayers: setup.selectedPlayers,
          keeper1: setup.keeper1,
          keeper2: setup.keeper2,
          group1: setup.group1,
          group2: setup.group2,
          group1Positions: setup.group1Positions,
          group2Positions: setup.group2Positions,
          currentKeeper: 1 as 1 | 2,
          matchTime: 0,
          isMatchRunning: false,
          half: 1 as 1 | 2,
          executedSubstitutions: []
        };
        setMatchState(initialState);

        // Generate all substitutions for the match
        generateSubstitutions(setup);
      } catch (e) {
        console.error('Failed to load match setup:', e);
      }
    }
    setLoading(false);
  }, []);

  const generateSubstitutions = (setup: any) => {
    const subs: Substitution[] = [];

    // Group 1 players (excluding current keeper)
    const group1FieldPlayers = setup.group1.filter((p: Player) => p.id !== setup.keeper1?.id);
    const group1OnField = group1FieldPlayers.slice(0, 3);
    const group1Subs = group1FieldPlayers.slice(3);

    // Group 2 players
    const group2OnField = setup.group2.slice(0, 3);
    const group2Subs = setup.group2.slice(3);

    let subId = 1;

    // Generate ALL possible substitutions for Group 1
    if (group1Subs.length > 0) {
      group1OnField.forEach(onFieldPlayer => {
        group1Subs.forEach(subPlayer => {
          subs.push({
            id: subId++,
            outPlayer: onFieldPlayer,
            inPlayer: subPlayer,
            group: 1,
            timing: `Groep 1: ${onFieldPlayer.name} ↔ ${subPlayer.name}`,
            executed: false
          });
        });
      });
    }

    // Generate ALL possible substitutions for Group 2
    if (group2Subs.length > 0) {
      group2OnField.forEach(onFieldPlayer => {
        group2Subs.forEach(subPlayer => {
          subs.push({
            id: subId++,
            outPlayer: onFieldPlayer,
            inPlayer: subPlayer,
            group: 2,
            timing: `Groep 2: ${onFieldPlayer.name} ↔ ${subPlayer.name}`,
            executed: false
          });
        });
      });
    }

    // Add half-time keeper change
    subs.push({
      id: subId++,
      outPlayer: setup.keeper1,
      inPlayer: setup.keeper2,
      group: 0 as any,
      timing: 'RUST - Keeper Wissel',
      executed: false
    });

    setSubstitutions(subs);
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMatchTimer = () => {
    if (!matchState) return;
    setMatchState(prev => prev ? {
      ...prev,
      isMatchRunning: !prev.isMatchRunning
    } : null);
  };

  const getSuggestedSubstitution = (): Substitution | null => {
    if (!matchState) return null;

    const availableSubs = substitutions.filter(sub => !sub.executed && !sub.timing.includes('RUST'));

    if (availableSubs.length === 0) return null;

    // Simple rotation logic: suggest based on execution count
    const executedCount = substitutions.filter(sub => sub.executed && !sub.timing.includes('RUST')).length;

    // Alternate between groups
    const suggestGroup = (executedCount % 2) + 1;
    const groupSubs = availableSubs.filter(sub => sub.group === suggestGroup);

    if (groupSubs.length === 0) {
      // If no subs available for suggested group, try other group
      return availableSubs.filter(sub => sub.group !== suggestGroup)[0] || null;
    }

    // Find least used player for substitution (simple rotation)
    return groupSubs[0];
  };

  const executeSubstitution = (subId: number) => {
    const substitution = substitutions.find(s => s.id === subId);
    if (!substitution || substitution.executed || !matchState) return;

    // Handle keeper substitution (half-time)
    if (substitution.timing.includes('RUST')) {
      setMatchState(prev => prev ? {
        ...prev,
        currentKeeper: prev.currentKeeper === 1 ? 2 : 1,
        half: 2,
        executedSubstitutions: [...prev.executedSubstitutions, subId]
      } : null);
    } else {
      // Handle regular field player substitution
      setMatchState(prev => {
        if (!prev) return null;

        const newState = { ...prev };

        if (substitution.group === 1) {
          const newGroup1 = [...prev.group1];
          const outIndex = newGroup1.findIndex(p => p.id === substitution.outPlayer.id);
          const inIndex = newGroup1.findIndex(p => p.id === substitution.inPlayer.id);

          if (outIndex !== -1 && inIndex !== -1) {
            [newGroup1[outIndex], newGroup1[inIndex]] = [newGroup1[inIndex], newGroup1[outIndex]];
            newState.group1 = newGroup1;
          }
        } else if (substitution.group === 2) {
          const newGroup2 = [...prev.group2];
          const outIndex = newGroup2.findIndex(p => p.id === substitution.outPlayer.id);
          const inIndex = newGroup2.findIndex(p => p.id === substitution.inPlayer.id);

          if (outIndex !== -1 && inIndex !== -1) {
            [newGroup2[outIndex], newGroup2[inIndex]] = [newGroup2[inIndex], newGroup2[outIndex]];
            newState.group2 = newGroup2;
          }
        }

        newState.executedSubstitutions = [...prev.executedSubstitutions, subId];
        return newState;
      });
    }

    // Mark substitution as executed
    setSubstitutions(prev =>
      prev.map(s => s.id === subId ? { ...s, executed: true } : s)
    );
  };

  const handlePlayerSwap = (playerId: string, position: string, groupNumber: number) => {
    if (!swapMode.active) {
      setSwapMode({
        active: true,
        firstPlayer: { playerId, position, group: groupNumber }
      });
    } else {
      const firstPlayer = swapMode.firstPlayer!;

      if (firstPlayer.group !== groupNumber) {
        alert('Je kunt alleen spelers binnen dezelfde groep wisselen!');
        setSwapMode({ active: false, firstPlayer: null });
        return;
      }

      if (firstPlayer.playerId === playerId) {
        setSwapMode({ active: false, firstPlayer: null });
        return;
      }

      // Perform the swap
      setMatchState(prev => {
        if (!prev) return null;

        const isGroup1 = groupNumber === 1;
        const positions = isGroup1 ? [...prev.group1Positions] : [...prev.group2Positions];

        const firstIndex = positions.indexOf(firstPlayer.position);
        const secondIndex = positions.indexOf(position);

        if (firstIndex !== -1 && secondIndex !== -1) {
          [positions[firstIndex], positions[secondIndex]] = [positions[secondIndex], positions[firstIndex]];
        }

        return {
          ...prev,
          group1Positions: isGroup1 ? positions : prev.group1Positions,
          group2Positions: isGroup1 ? prev.group2Positions : positions
        };
      });

      setSwapMode({ active: false, firstPlayer: null });
    }
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

  const currentKeeper = matchState.currentKeeper === 1 ? matchState.keeper1 : matchState.keeper2;
  const suggestedSub = getSuggestedSubstitution();
  const restSub = substitutions.find(sub => sub.timing.includes('RUST') && !sub.executed);

  // Get player by position logic
  const getPlayerByPosition = (group: Player[], positions: string[], targetPosition: string) => {
    const posIndex = positions.indexOf(targetPosition);
    if (posIndex === -1) return null;

    if (targetPosition === 'keeper') {
      return currentKeeper;
    }

    const nonKeepers = group.filter(p => p.id !== matchState.keeper1?.id && p.id !== matchState.keeper2?.id);
    const adjustedIndex = targetPosition === 'keeper' ? -1 : positions.slice(0, posIndex).filter(p => p !== 'keeper').length;
    return nonKeepers[adjustedIndex] || null;
  };

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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-3 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Timer + Field */}
          <div className="space-y-6">
            {/* Timer */}
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
              {swapMode.active && (
                <div className="mt-4 bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 text-center">
                  <p className="text-sm font-bold text-yellow-800">
                    🔄 Klik op een andere speler binnen dezelfde groep om van positie te wisselen
                  </p>
                  <button
                    onClick={() => setSwapMode({ active: false, firstPlayer: null })}
                    className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
                  >
                    Annuleren
                  </button>
                </div>
              )}
            </div>

            {/* Field Visualization */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">⚽ Huidige Opstelling</h3>
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-2">
                <div className="relative w-full max-w-[280px] mx-auto" style={{ aspectRatio: '2/3', minWidth: '240px' }}>
                  <div className="w-full h-full bg-green-200 border-2 border-white rounded relative">

                    {/* Goals */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>

                    {/* Keeper - always at bottom */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-blue-500 border-2 border-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        🥅
                      </div>
                      <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-yellow-100 px-2 py-1 rounded shadow min-w-[60px]">
                        {currentKeeper?.name || 'Keeper'}
                      </div>
                    </div>

                    {/* Dynamic player positions */}
                    {matchState.group1Positions.concat(matchState.group2Positions).map((position) => {
                      if (position === 'keeper') return null;

                      const isGroup1Position = matchState.group1Positions.includes(position);
                      const player = getPlayerByPosition(
                        isGroup1Position ? matchState.group1 : matchState.group2,
                        isGroup1Position ? matchState.group1Positions : matchState.group2Positions,
                        position
                      );

                      if (!player) return null;

                      const playerColorClasses = isGroup1Position
                        ? 'bg-blue-500 border-blue-700'
                        : 'bg-green-500 border-green-700';

                      const positions = {
                        'linksachter': { bottom: '20%', left: '15%', label: 'LA' },
                        'rechtsachter': { bottom: '20%', right: '15%', label: 'RA' },
                        'midden': { top: '45%', left: '50%', transform: 'translate(-50%, -50%)', label: 'M' },
                        'linksvoor': { top: '15%', left: '15%', label: 'LV' },
                        'rechtsvoor': { top: '15%', right: '15%', label: 'RV' }
                      };

                      const pos = positions[position as keyof typeof positions];
                      if (!pos) return null;

                      const isFirstSelected = swapMode.firstPlayer?.playerId === player.id;
                      const groupNumber = isGroup1Position ? 1 : 2;

                      return (
                        <div
                          key={`${position}-${player.id}`}
                          className="absolute cursor-pointer"
                          style={pos}
                          onClick={() => handlePlayerSwap(player.id, position, groupNumber)}
                        >
                          <div className={`${playerColorClasses} border-2 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all hover:scale-110 ${
                            isFirstSelected ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                          } ${
                            swapMode.active ? 'hover:ring-2 hover:ring-yellow-300' : ''
                          }`}>
                            {pos.label}
                          </div>
                          <div className={`text-xs text-center mt-1 font-bold text-gray-900 px-2 py-1 rounded shadow min-w-[60px] ${
                            isFirstSelected ? 'bg-yellow-300' : 'bg-yellow-100'
                          }`}>
                            {player.name}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Substitutions */}
          <div className="space-y-4">

            {/* Suggested Substitution */}
            {suggestedSub && (
              <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-blue-500">
                <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Voorgestelde Wissel</h3>
                <div
                  className="border-2 border-blue-400 bg-blue-50 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                  onClick={() => executeSubstitution(suggestedSub.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-blue-800 mb-1">
                        {suggestedSub.timing}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Uit</div>
                          <div className="font-bold text-red-600">⬇️ {suggestedSub.outPlayer.name}</div>
                        </div>
                        <div className="text-lg">↔️</div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">In</div>
                          <div className="font-bold text-green-600">⬆️ {suggestedSub.inPlayer.name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-xs">
                        Aanbevolen
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Half-time Substitution */}
            {restSub && matchState.half === 1 && (
              <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-orange-900 mb-3">🏃‍♂️ Rust Wissel</h3>
                <div
                  className="border-2 border-orange-400 bg-orange-50 rounded-lg p-3 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all"
                  onClick={() => executeSubstitution(restSub.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-orange-800 mb-1">
                        {restSub.timing}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Uit</div>
                          <div className="font-bold text-red-600">⬇️ {restSub.outPlayer.name}</div>
                        </div>
                        <div className="text-lg">↔️</div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">In</div>
                          <div className="font-bold text-green-600">⬆️ {restSub.inPlayer.name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="bg-orange-600 text-white px-3 py-1 rounded font-bold text-xs">
                        Rust!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Available Substitutions */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🔄 Alle Mogelijke Wissels</h3>

              {/* Group 1 Substitutions */}
              <div className="mb-4">
                <h4 className="text-md font-bold text-blue-800 mb-2">🔵 Groep 1 Wissels</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {substitutions.filter(sub => sub.group === 1 && !sub.timing.includes('RUST')).map((sub) => (
                    <div
                      key={sub.id}
                      className={`border rounded-lg p-2 transition-all text-sm ${
                        sub.executed
                          ? 'bg-gray-50 border-gray-300 opacity-60'
                          : sub.id === suggestedSub?.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white border-gray-300 hover:border-blue-400 cursor-pointer hover:shadow-sm'
                      }`}
                      onClick={() => !sub.executed && executeSubstitution(sub.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-center">
                            <span className="font-bold text-red-600 text-xs">⬇️ {sub.outPlayer.name}</span>
                          </div>
                          <span className="text-xs">↔️</span>
                          <div className="text-center">
                            <span className="font-bold text-green-600 text-xs">⬆️ {sub.inPlayer.name}</span>
                          </div>
                        </div>
                        <div className="text-xs">
                          {sub.executed ? (
                            <span className="text-green-600 font-bold">✅</span>
                          ) : sub.id === suggestedSub?.id ? (
                            <span className="text-blue-600 font-bold">💡</span>
                          ) : (
                            <span className="text-gray-400">○</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2 Substitutions */}
              <div>
                <h4 className="text-md font-bold text-green-800 mb-2">🔴 Groep 2 Wissels</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {substitutions.filter(sub => sub.group === 2 && !sub.timing.includes('RUST')).map((sub) => (
                    <div
                      key={sub.id}
                      className={`border rounded-lg p-2 transition-all text-sm ${
                        sub.executed
                          ? 'bg-gray-50 border-gray-300 opacity-60'
                          : sub.id === suggestedSub?.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white border-gray-300 hover:border-green-400 cursor-pointer hover:shadow-sm'
                      }`}
                      onClick={() => !sub.executed && executeSubstitution(sub.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-center">
                            <span className="font-bold text-red-600 text-xs">⬇️ {sub.outPlayer.name}</span>
                          </div>
                          <span className="text-xs">↔️</span>
                          <div className="text-center">
                            <span className="font-bold text-green-600 text-xs">⬆️ {sub.inPlayer.name}</span>
                          </div>
                        </div>
                        <div className="text-xs">
                          {sub.executed ? (
                            <span className="text-green-600 font-bold">✅</span>
                          ) : sub.id === suggestedSub?.id ? (
                            <span className="text-blue-600 font-bold">💡</span>
                          ) : (
                            <span className="text-gray-400">○</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}