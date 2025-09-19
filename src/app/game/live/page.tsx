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
  playingTimes: { [playerId: string]: number }; // playing time in seconds
  lastSubTime: number; // last substitution time for calculating playing time
}


export default function LiveMatchPage() {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [swapMode, setSwapMode] = useState<{active: boolean, firstPlayer: {playerId: string, position: string, group: number} | null}>({
    active: false,
    firstPlayer: null
  });
  const [substituteMode, setSubstituteMode] = useState<{active: boolean, outPlayer: {playerId: string, group: number} | null}>({active: false, outPlayer: null});
  const matchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load match setup from localStorage
    const savedMatch = localStorage.getItem('currentMatch');
    if (savedMatch) {
      try {
        const setup = JSON.parse(savedMatch);
        // Initialize playing times for all selected players
        const initialPlayingTimes: { [playerId: string]: number } = {};
        setup.selectedPlayers.forEach((player: Player) => {
          initialPlayingTimes[player.id] = 0;
        });

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
          executedSubstitutions: [],
          playingTimes: initialPlayingTimes,
          lastSubTime: 0
        };
        setMatchState(initialState);

      } catch (e) {
        console.error('Failed to load match setup:', e);
      }
    }
    setLoading(false);
  }, []);


  useEffect(() => {
    if (matchState?.isMatchRunning) {
      matchIntervalRef.current = setInterval(() => {
        setMatchState(prev => {
          if (!prev) return null;

          const newState = {
            ...prev,
            matchTime: prev.matchTime + 1
          };

          // Update playing times for current on-field players
          const updatedPlayingTimes = { ...prev.playingTimes };

          // Current keeper gets playing time
          const currentKeeper = prev.currentKeeper === 1 ? prev.keeper1 : prev.keeper2;
          if (currentKeeper) {
            updatedPlayingTimes[currentKeeper.id] = (updatedPlayingTimes[currentKeeper.id] || 0) + 1;
          }

          // Group 1 on-field players (first 3 non-keeper players)
          const group1NonKeepers = prev.group1.filter(p => p.id !== prev.keeper1?.id && p.id !== prev.keeper2?.id);
          group1NonKeepers.slice(0, 3).forEach(player => {
            updatedPlayingTimes[player.id] = (updatedPlayingTimes[player.id] || 0) + 1;
          });

          // Group 2 on-field players (first 3 players)
          prev.group2.slice(0, 3).forEach(player => {
            updatedPlayingTimes[player.id] = (updatedPlayingTimes[player.id] || 0) + 1;
          });

          newState.playingTimes = updatedPlayingTimes;
          return newState;
        });
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



  const handlePlayerClick = (playerId: string, position: string, groupNumber: number, isOnField: boolean) => {
    // Handle substitution mode
    if (substituteMode.active) {
      const outPlayer = substituteMode.outPlayer;
      if (!outPlayer) return;

      // Can only substitute within same group, except keepers
      if (position !== 'keeper' && outPlayer.group !== groupNumber) {
        alert('Je kunt alleen spelers binnen dezelfde groep wisselen!');
        setSubstituteMode({ active: false, outPlayer: null });
        return;
      }

      // Can't substitute with the same player
      if (outPlayer.playerId === playerId) {
        setSubstituteMode({ active: false, outPlayer: null });
        return;
      }

      // Execute substitution
      executeDirectSubstitution(outPlayer.playerId, playerId, groupNumber);
      setSubstituteMode({ active: false, outPlayer: null });
      return;
    }

    // Handle position swap mode (only for on-field players)
    if (swapMode.active) {
      if (!isOnField) {
        alert('Je kunt alleen positiewissels doen tussen spelers op het veld!');
        return;
      }

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

      // Perform the position swap
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
      return;
    }

    // Start substitution or position swap mode
    if (isOnField) {
      setSubstituteMode({
        active: true,
        outPlayer: { playerId, group: groupNumber }
      });
    } else {
      // For substitute players, start position swap with any on-field player in same group
      setSwapMode({
        active: true,
        firstPlayer: { playerId, position: 'substitute', group: groupNumber }
      });
    }
  };

  const executeDirectSubstitution = (outPlayerId: string, inPlayerId: string, groupNumber: number) => {
    if (!matchState) return;

    setMatchState(prev => {
      if (!prev) return null;

      const newState = { ...prev };

      if (groupNumber === 1) {
        const newGroup1 = [...prev.group1];
        const outIndex = newGroup1.findIndex(p => p.id === outPlayerId);
        const inIndex = newGroup1.findIndex(p => p.id === inPlayerId);

        if (outIndex !== -1 && inIndex !== -1) {
          [newGroup1[outIndex], newGroup1[inIndex]] = [newGroup1[inIndex], newGroup1[outIndex]];
          newState.group1 = newGroup1;
        }
      } else if (groupNumber === 2) {
        const newGroup2 = [...prev.group2];
        const outIndex = newGroup2.findIndex(p => p.id === outPlayerId);
        const inIndex = newGroup2.findIndex(p => p.id === inPlayerId);

        if (outIndex !== -1 && inIndex !== -1) {
          [newGroup2[outIndex], newGroup2[inIndex]] = [newGroup2[inIndex], newGroup2[outIndex]];
          newState.group2 = newGroup2;
        }
      }

      return newState;
    });
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
      <header className="bg-white shadow-lg border-b-2 border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-bold text-sm sm:text-lg">
                ← Home
              </Link>
              <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">
                Live Wedstrijd - {matchState.half}e Helft
              </h1>
            </div>

            {/* Timer in Header */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">
                  {formatTime(matchState.matchTime)}
                </div>
                <div className="text-xs text-gray-600">Wedstrijdtijd</div>
              </div>
              <button
                onClick={toggleMatchTimer}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-bold text-white transition-all transform hover:scale-105 text-sm ${
                  matchState.isMatchRunning
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {matchState.isMatchRunning ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-3 px-3 sm:py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Field */}
          <div className="space-y-6">
            {/* Mode Instructions */}
            {swapMode.active && (
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 text-center">
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

            {substituteMode.active && (
              <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-blue-800">
                  ↔️ Klik op een wisselspeler om de substitutie uit te voeren
                </p>
                <button
                  onClick={() => setSubstituteMode({ active: false, outPlayer: null })}
                  className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                >
                  Annuleren
                </button>
              </div>
            )}

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
                          onClick={() => handlePlayerClick(player.id, position, groupNumber, true)}
                        >
                          <div className={`${playerColorClasses} border-2 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all hover:scale-110 ${
                            isFirstSelected ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                          } ${
                            substituteMode.outPlayer?.playerId === player.id ? 'ring-4 ring-blue-400 ring-opacity-75' : ''
                          } ${
                            swapMode.active || substituteMode.active ? 'hover:ring-2 hover:ring-yellow-300' : ''
                          }`}>
                            {pos.label}
                          </div>
                          <div className={`text-xs text-center mt-1 font-bold text-gray-900 px-2 py-1 rounded shadow min-w-[60px] ${
                            isFirstSelected ? 'bg-yellow-300' : substituteMode.outPlayer?.playerId === player.id ? 'bg-blue-300' : 'bg-yellow-100'
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

            {/* Substitute Players */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🪧 Wisselspelers</h3>

              {/* Group 1 Substitutes */}
              <div className="mb-4">
                <h4 className="text-md font-bold text-blue-800 mb-2">🔵 Groep 1 Wissels</h4>
                <div className="flex flex-wrap gap-2">
                  {matchState.group1.filter(p => p.id !== matchState.keeper1?.id && p.id !== matchState.keeper2?.id).slice(3).map((player) => (
                    <div
                      key={`sub-g1-${player.id}`}
                      className={`cursor-pointer border-2 rounded-lg p-2 transition-all hover:shadow-md ${
                        substituteMode.active && !substituteMode.outPlayer ? 'border-gray-300' :
                        substituteMode.active ? 'border-blue-400 hover:border-blue-500' : 'border-blue-300 hover:border-blue-400'
                      } ${
                        swapMode.firstPlayer?.playerId === player.id ? 'bg-yellow-100 border-yellow-400' : 'bg-blue-50'
                      }`}
                      onClick={() => handlePlayerClick(player.id, 'substitute', 1, false)}
                    >
                      <div className="text-center">
                        <div className="bg-blue-500 border-2 border-blue-700 rounded-full w-8 h-8 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white">
                          W
                        </div>
                        <div className="text-xs font-bold text-gray-900">{player.name}</div>
                        <div className="text-xs text-blue-600">Groep 1</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2 Substitutes */}
              <div className="mb-4">
                <h4 className="text-md font-bold text-green-800 mb-2">🔴 Groep 2 Wissels</h4>
                <div className="flex flex-wrap gap-2">
                  {matchState.group2.slice(3).map((player) => (
                    <div
                      key={`sub-g2-${player.id}`}
                      className={`cursor-pointer border-2 rounded-lg p-2 transition-all hover:shadow-md ${
                        substituteMode.active && !substituteMode.outPlayer ? 'border-gray-300' :
                        substituteMode.active ? 'border-green-400 hover:border-green-500' : 'border-green-300 hover:border-green-400'
                      } ${
                        swapMode.firstPlayer?.playerId === player.id ? 'bg-yellow-100 border-yellow-400' : 'bg-green-50'
                      }`}
                      onClick={() => handlePlayerClick(player.id, 'substitute', 2, false)}
                    >
                      <div className="text-center">
                        <div className="bg-green-500 border-2 border-green-700 rounded-full w-8 h-8 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white">
                          W
                        </div>
                        <div className="text-xs font-bold text-gray-900">{player.name}</div>
                        <div className="text-xs text-green-600">Groep 2</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternative Keeper */}
              {matchState.currentKeeper === 1 && matchState.keeper2 && (
                <div>
                  <h4 className="text-md font-bold text-gray-800 mb-2">🥅 Reserve Keeper</h4>
                  <div className="flex justify-start">
                    <div
                      className={`cursor-pointer border-2 rounded-lg p-2 transition-all hover:shadow-md ${
                        substituteMode.active && !substituteMode.outPlayer ? 'border-gray-300' :
                        substituteMode.active ? 'border-blue-400 hover:border-blue-500' : 'border-gray-300 hover:border-gray-400'
                      } ${
                        swapMode.firstPlayer?.playerId === matchState.keeper2.id ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50'
                      }`}
                      onClick={() => handlePlayerClick(matchState.keeper2.id, 'keeper', 1, false)}
                    >
                      <div className="text-center">
                        <div className="bg-gray-500 border-2 border-gray-700 rounded-full w-8 h-8 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white">
                          🥅
                        </div>
                        <div className="text-xs font-bold text-gray-900">{matchState.keeper2.name}</div>
                        <div className="text-xs text-gray-600">Reserve</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {matchState.currentKeeper === 2 && matchState.keeper1 && (
                <div>
                  <h4 className="text-md font-bold text-gray-800 mb-2">🥅 Reserve Keeper</h4>
                  <div className="flex justify-start">
                    <div
                      className={`cursor-pointer border-2 rounded-lg p-2 transition-all hover:shadow-md ${
                        substituteMode.active && !substituteMode.outPlayer ? 'border-gray-300' :
                        substituteMode.active ? 'border-blue-400 hover:border-blue-500' : 'border-gray-300 hover:border-gray-400'
                      } ${
                        swapMode.firstPlayer?.playerId === matchState.keeper1.id ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50'
                      }`}
                      onClick={() => handlePlayerClick(matchState.keeper1.id, 'keeper', 1, false)}
                    >
                      <div className="text-center">
                        <div className="bg-gray-500 border-2 border-gray-700 rounded-full w-8 h-8 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white">
                          🥅
                        </div>
                        <div className="text-xs font-bold text-gray-900">{matchState.keeper1.name}</div>
                        <div className="text-xs text-gray-600">Reserve</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Playing Time Overview */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">⏱️ Speeltijd Overzicht</h3>
              <div className="space-y-2">
                {matchState.selectedPlayers
                  .map(player => ({
                    ...player,
                    playingTime: matchState.playingTimes[player.id] || 0
                  }))
                  .sort((a, b) => b.playingTime - a.playingTime)
                  .map((player, index) => {
                    const minutes = Math.floor(player.playingTime / 60);
                    const seconds = player.playingTime % 60;
                    const isOnField = (
                      (matchState.currentKeeper === 1 ? matchState.keeper1?.id : matchState.keeper2?.id) === player.id ||
                      matchState.group1.filter(p => p.id !== matchState.keeper1?.id && p.id !== matchState.keeper2?.id).slice(0, 3).some(p => p.id === player.id) ||
                      matchState.group2.slice(0, 3).some(p => p.id === player.id)
                    );

                    return (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between p-2 rounded border ${
                          isOnField ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        } ${
                          index === 0 ? 'ring-2 ring-red-300' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            isOnField ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span className="font-bold text-sm">{player.name}</span>
                          {index === 0 && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">Meeste tijd</span>}
                        </div>
                        <div className="text-sm font-bold">
                          {minutes}:{seconds.toString().padStart(2, '0')}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>

          {/* Right Column: Game Controls */}
          <div className="space-y-4">

            {/* Half-time Keeper Change */}
            {matchState.half === 1 && (
              <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-orange-900 mb-3">🏃‍♂️ Rust Keeper Wissel</h3>
                <div
                  className="border-2 border-orange-400 bg-orange-50 rounded-lg p-3 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all"
                  onClick={() => {
                    setMatchState(prev => prev ? {
                      ...prev,
                      currentKeeper: prev.currentKeeper === 1 ? 2 : 1,
                      half: 2
                    } : null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-orange-800 mb-1">
                        Keeper Wissel voor 2e Helft
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-center">
                          <div className="text-xs text-gray-600">Uit</div>
                          <div className="font-bold text-red-600">⬇️ {matchState.keeper1?.name}</div>
                        </div>
                        <div className="text-lg">↔️</div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">In</div>
                          <div className="font-bold text-green-600">⬆️ {matchState.keeper2?.name}</div>
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

            {/* Match Instructions */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Hoe te Wisselen</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>Klik op een speler die je van het veld wilt halen</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>Klik op een wisselspeler om de substitutie uit te voeren</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 font-bold">💡</span>
                  <span>Voor positiewissels: klik twee keer binnen dezelfde groep</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-600 font-bold">⏱️</span>
                  <span>Speeltijd wordt automatisch bijgehouden per speler</span>
                </div>
              </div>
            </div>

            {/* Match Summary */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Wedstrijd Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Huidige Helft:</span>
                  <span className="font-bold">{matchState.half}e Helft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Huidige Keeper:</span>
                  <span className="font-bold">{currentKeeper?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Spelers op Veld:</span>
                  <span className="font-bold">7 spelers</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Groep 1 (Veld):</span>
                  <span className="font-bold text-blue-600">
                    {matchState.group1.filter(p => p.id !== matchState.keeper1?.id && p.id !== matchState.keeper2?.id).slice(0, 3).length} spelers
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Groep 2 (Veld):</span>
                  <span className="font-bold text-green-600">
                    {matchState.group2.slice(0, 3).length} spelers
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}