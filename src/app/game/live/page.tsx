'use client';
import Image from 'next/image';

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

          // Group 1 on-field players (first 3 players)
          prev.group1.slice(0, 3).forEach(player => {
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

  const resetMatchTimer = () => {
    if (!matchState) return;
    setMatchState(prev => prev ? {
      ...prev,
      matchTime: 0,
      isMatchRunning: false
    } : null);
  };

  const adjustMatchTime = (minutes: number) => {
    if (!matchState) return;

    setMatchState(prev => {
      if (!prev) return prev;

      const timeChangeInSeconds = minutes * 60;
      const newMatchTime = Math.max(0, prev.matchTime + timeChangeInSeconds);

      // Adjust playing times for field players (both groups, first 3 players)
      const updatedPlayingTimes = { ...prev.playingTimes };

      // Group 1 field players (positions 0, 1, 2, 3 - including keeper)
      prev.group1.slice(0, 4).forEach(player => {
        updatedPlayingTimes[player.id] = Math.max(0, updatedPlayingTimes[player.id] + timeChangeInSeconds);
      });

      // Group 2 field players (positions 0, 1, 2)
      prev.group2.slice(0, 3).forEach(player => {
        updatedPlayingTimes[player.id] = Math.max(0, updatedPlayingTimes[player.id] + timeChangeInSeconds);
      });

      return {
        ...prev,
        matchTime: newMatchTime,
        playingTimes: updatedPlayingTimes
      };
    });
  };



  const handlePlayerClick = (playerId: string, position: string, groupNumber: number, isOnField: boolean) => {
    // Handle substitution mode
    if (substituteMode.active) {
      const outPlayer = substituteMode.outPlayer;
      if (!outPlayer) return;

      // Can only substitute within same group - no keeper restriction
      if (outPlayer.group !== groupNumber) {
        alert('Je kunt alleen spelers binnen dezelfde groep wisselen!');
        setSubstituteMode({ active: false, outPlayer: null });
        return;
      }

      // Can't substitute with the same player
      if (outPlayer.playerId === playerId) {
        setSubstituteMode({ active: false, outPlayer: null });
        return;
      }

      // Execute substitution (works both ways: field->substitute or substitute->field)
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

    // Start substitution mode for both field and substitute players
    if (isOnField) {
      setSubstituteMode({
        active: true,
        outPlayer: { playerId, group: groupNumber }
      });
    } else {
      // For substitute players, start substitution mode to swap with field player
      setSubstituteMode({
        active: true,
        outPlayer: { playerId, group: groupNumber }
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

  // Get player by position logic
  const getPlayerByPosition = (group: Player[], positions: string[], targetPosition: string) => {
    const posIndex = positions.indexOf(targetPosition);
    if (posIndex === -1) return null;

    const allPlayers = group;
    return allPlayers[posIndex] || null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-lg border-b-2 border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/"
                className="text-black hover:text-gray-700 font-bold text-lg sm:text-xl transition-colors"
                onClick={() => {
                  localStorage.removeItem('gameSetup');
                  localStorage.removeItem('currentMatch');
                }}
              >
                <Image
                  src="/Logo.jpg"
                  alt="Wisselapp Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </Link>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Live Wedstrijd</h1>
            </div>

            {/* Timer in Header */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={resetMatchTimer}
                className="text-gray-600 hover:text-gray-800 transition-all text-xl"
                title="Reset timer (behoudt speeltijden)"
              >
                🔄
              </button>
              <div className="text-center">
                <button
                  onClick={() => adjustMatchTime(1)}
                  className="text-gray-600 hover:text-gray-800 transition-all text-sm mb-1 block mx-auto"
                  title="Voeg 1 minuut toe"
                >
                  +
                </button>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">
                  {formatTime(matchState.matchTime)}
                </div>
                <button
                  onClick={() => adjustMatchTime(-1)}
                  className="text-gray-600 hover:text-gray-800 transition-all text-sm mt-1 block mx-auto"
                  title="Trek 1 minuut af"
                >
                  −
                </button>
              </div>
              <button
                onClick={toggleMatchTimer}
                className="text-gray-600 hover:text-gray-800 transition-all text-xl"
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

            {/* Field Visualization with Substitutes */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-2">
                <div className="relative w-full max-w-[280px] mx-auto" style={{ aspectRatio: '2/2.2', minWidth: '240px' }}>
                  <div className="w-full h-full bg-green-200 border-2 border-white rounded relative">

                    {/* Goals */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>


                    {/* Dynamic player positions */}
                    {matchState.group1Positions.concat(matchState.group2Positions).map((position) => {

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
                        'keeper': { bottom: '4%', left: '50%', transform: 'translate(-50%, 0)', label: '🥅' },
                        'linksachter': { bottom: '20%', left: '15%', label: 'LA' },
                        'rechtsachter': { bottom: '20%', right: '15%', label: 'RA' },
                        'midden': { top: '45%', left: '50%', transform: 'translate(-50%, -50%)', label: 'M' },
                        'linksvoor': { top: '8%', left: '15%', label: 'LV' },
                        'rechtsvoor': { top: '8%', right: '15%', label: 'RV' }
                      };

                      const pos = positions[position as keyof typeof positions];
                      if (!pos) return null;

                      const isFirstSelected = swapMode.firstPlayer?.playerId === player.id;
                      const groupNumber = isGroup1Position ? 1 : 2;
                      const playingTime = matchState.playingTimes[player.id] || 0;
                      const minutes = Math.floor(playingTime / 60);
                      const seconds = playingTime % 60;

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
                            <div>{player.name}</div>
                            <div className="text-xs font-normal">{minutes}:{seconds.toString().padStart(2, '0')}</div>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>

                {/* Wisselspelers - onderaan het veld */}
                <div className="mt-4 text-center">
                  <div className="flex justify-center flex-wrap gap-4">
                    {/* Group 1 Substitutes */}
                    {matchState.group1.slice(3).map((player) => {
                      const playingTime = matchState.playingTimes[player.id] || 0;
                      const minutes = Math.floor(playingTime / 60);
                      const seconds = playingTime % 60;

                      return (
                        <div
                          key={`sub-g1-${player.id}`}
                          className="text-center cursor-pointer"
                          onClick={() => handlePlayerClick(player.id, 'substitute', 1, false)}
                        >
                          <div className={`bg-blue-400 border-2 border-blue-600 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow mx-auto transition-all hover:scale-110 ${
                            swapMode.firstPlayer?.playerId === player.id ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                          } ${
                            substituteMode.outPlayer?.playerId === player.id ? 'ring-4 ring-blue-400 ring-opacity-75' : ''
                          } ${
                            swapMode.active || substituteMode.active ? 'hover:ring-2 hover:ring-yellow-300' : ''
                          }`}>
                            W
                          </div>
                          <div className={`text-xs font-bold mt-1 text-gray-900 px-2 py-1 rounded shadow ${
                            swapMode.firstPlayer?.playerId === player.id ? 'bg-yellow-300' :
                            substituteMode.outPlayer?.playerId === player.id ? 'bg-blue-300' : 'bg-yellow-100'
                          }`}>
                            <div>{player.name}</div>
                            <div className="text-xs font-normal">{minutes}:{seconds.toString().padStart(2, '0')}</div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Group 2 Substitutes */}
                    {matchState.group2.slice(3).map((player) => {
                      const playingTime = matchState.playingTimes[player.id] || 0;
                      const minutes = Math.floor(playingTime / 60);
                      const seconds = playingTime % 60;

                      return (
                        <div
                          key={`sub-g2-${player.id}`}
                          className="text-center cursor-pointer"
                          onClick={() => handlePlayerClick(player.id, 'substitute', 2, false)}
                        >
                          <div className={`bg-green-500 border-2 border-green-700 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow mx-auto transition-all hover:scale-110 ${
                            swapMode.firstPlayer?.playerId === player.id ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                          } ${
                            substituteMode.outPlayer?.playerId === player.id ? 'ring-4 ring-green-400 ring-opacity-75' : ''
                          } ${
                            swapMode.active || substituteMode.active ? 'hover:ring-2 hover:ring-yellow-300' : ''
                          }`}>
                            W
                          </div>
                          <div className={`text-xs font-bold mt-1 text-gray-900 px-2 py-1 rounded shadow ${
                            swapMode.firstPlayer?.playerId === player.id ? 'bg-yellow-300' :
                            substituteMode.outPlayer?.playerId === player.id ? 'bg-green-300' : 'bg-yellow-100'
                          }`}>
                            <div>{player.name}</div>
                            <div className="text-xs font-normal">{minutes}:{seconds.toString().padStart(2, '0')}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Next Substitution Suggestions */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🔄 Voorgestelde Volgende Wissel</h3>
              <div className="space-y-4">

                {/* Group 1 Suggestion */}
                <div className="border border-blue-200 rounded-lg p-2 bg-blue-50">
                  {(() => {
                    // Get field players (positions 1-2, excluding keeper at position 0)
                    const fieldPlayersG1 = matchState.group1
                      .slice(1, 3) // Positions 1 and 2 (after keeper)
                      .map(player => ({
                        ...player,
                        playingTime: matchState.playingTimes[player.id] || 0
                      }));

                    // Get bench players (positions 3+)
                    const benchPlayersG1 = matchState.group1
                      .slice(3)
                      .map(player => ({
                        ...player,
                        playingTime: matchState.playingTimes[player.id] || 0
                      }));

                    if (fieldPlayersG1.length === 0 || benchPlayersG1.length === 0) {
                      return <p className="text-xs text-gray-600">Geen wissel mogelijk</p>;
                    }

                    // Find field player with most playing time (to be substituted out)
                    // If playing times are close (within 1 second), use alphabetical order
                    const sortedFieldPlayers = fieldPlayersG1.sort((a, b) => b.playingTime - a.playingTime);
                    const maxPlayingTime = sortedFieldPlayers[0].playingTime;

                    // Get players with highest playing time (within 1 second of max)
                    const playersWithMaxTime = sortedFieldPlayers.filter(p => p.playingTime >= maxPlayingTime - 1);
                    const playerToSubOut = playersWithMaxTime.sort((a, b) => a.name.localeCompare(b.name))[0];

                    // Find bench player with least playing time (to substitute in)
                    // If tied, use alphabetical order
                    const sortedBenchPlayers = benchPlayersG1.sort((a, b) => a.playingTime - b.playingTime);
                    const minPlayingTime = sortedBenchPlayers[0].playingTime;
                    const playersWithMinTime = sortedBenchPlayers.filter(p => p.playingTime <= minPlayingTime + 1);
                    const playerToSubIn = playersWithMinTime.sort((a, b) => a.name.localeCompare(b.name))[0];

                    return (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-gray-900">
                          {playerToSubIn.name} → {playerToSubOut.name}
                        </span>
                        <button
                          onClick={() => {
                            // Find the positions of both players in group1
                            const outPlayerIndex = matchState.group1.findIndex(p => p.id === playerToSubOut.id);
                            const inPlayerIndex = matchState.group1.findIndex(p => p.id === playerToSubIn.id);

                            if (outPlayerIndex !== -1 && inPlayerIndex !== -1) {
                              // Create new group1 array with swapped positions
                              const newGroup1 = [...matchState.group1];
                              [newGroup1[outPlayerIndex], newGroup1[inPlayerIndex]] = [newGroup1[inPlayerIndex], newGroup1[outPlayerIndex]];

                              setMatchState(prev => prev ? ({
                                ...prev,
                                group1: newGroup1
                              }) : null);
                            }
                          }}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          Doorvoeren
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Group 2 Suggestion */}
                <div className="border border-green-200 rounded-lg p-2 bg-green-50">
                  {(() => {
                    // Get field players (positions 0-2, Group 2 has no keeper)
                    const fieldPlayersG2 = matchState.group2
                      .slice(0, 3) // Positions 0, 1 and 2 (all field players)
                      .map(player => ({
                        ...player,
                        playingTime: matchState.playingTimes[player.id] || 0
                      }));

                    // Get bench players (positions 3+)
                    const benchPlayersG2 = matchState.group2
                      .slice(3)
                      .map(player => ({
                        ...player,
                        playingTime: matchState.playingTimes[player.id] || 0
                      }));

                    if (fieldPlayersG2.length === 0 || benchPlayersG2.length === 0) {
                      return <p className="text-xs text-gray-600">Geen wissel mogelijk</p>;
                    }

                    // Find field player with most playing time (to be substituted out)
                    // If playing times are close (within 1 second), use alphabetical order
                    const sortedFieldPlayers = fieldPlayersG2.sort((a, b) => b.playingTime - a.playingTime);
                    const maxPlayingTime = sortedFieldPlayers[0].playingTime;

                    // Get players with highest playing time (within 1 second of max)
                    const playersWithMaxTime = sortedFieldPlayers.filter(p => p.playingTime >= maxPlayingTime - 1);
                    const playerToSubOut = playersWithMaxTime.sort((a, b) => a.name.localeCompare(b.name))[0];

                    // Find bench player with least playing time (to substitute in)
                    // If tied, use alphabetical order
                    const sortedBenchPlayers = benchPlayersG2.sort((a, b) => a.playingTime - b.playingTime);
                    const minPlayingTime = sortedBenchPlayers[0].playingTime;
                    const playersWithMinTime = sortedBenchPlayers.filter(p => p.playingTime <= minPlayingTime + 1);
                    const playerToSubIn = playersWithMinTime.sort((a, b) => a.name.localeCompare(b.name))[0];

                    return (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-gray-900">
                          {playerToSubIn.name} → {playerToSubOut.name}
                        </span>
                        <button
                          onClick={() => {
                            // Find the positions of both players in group2
                            const outPlayerIndex = matchState.group2.findIndex(p => p.id === playerToSubOut.id);
                            const inPlayerIndex = matchState.group2.findIndex(p => p.id === playerToSubIn.id);

                            if (outPlayerIndex !== -1 && inPlayerIndex !== -1) {
                              // Create new group2 array with swapped positions
                              const newGroup2 = [...matchState.group2];
                              [newGroup2[outPlayerIndex], newGroup2[inPlayerIndex]] = [newGroup2[inPlayerIndex], newGroup2[outPlayerIndex]];

                              setMatchState(prev => prev ? ({
                                ...prev,
                                group2: newGroup2
                              }) : null);
                            }
                          }}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          Doorvoeren
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Game Controls */}
          <div className="space-y-4">



          </div>

        </div>
      </main>
    </div>
  );
}