'use client';
import Image from 'next/image';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  number: number | null;
  active: boolean;
}

interface GameSetup {
  selectedPlayers: Player[];
  keeper1: Player | null; // Eerste helft keeper
  keeper2: Player | null; // Tweede helft keeper
  playerPositions: { [playerId: string]: string }; // playerId -> position mapping
  positionGroups: { [position: string]: 1 | 2 }; // position -> group mapping
  step: 'select-players' | 'select-keepers' | 'assign-positions' | 'create-groups';
}

export default function NewGamePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapMode, setSwapMode] = useState<{active: boolean, firstPlayer: {playerId: string, position: string, group: number} | null}>({
    active: false,
    firstPlayer: null
  });
  const [gameSetup, setGameSetup] = useState<GameSetup>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gameSetup');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved game setup:', e);
        }
      }
    }
    return {
      selectedPlayers: [],
      keeper1: null,
      keeper2: null,
      playerPositions: {},
      positionGroups: {},
      step: 'select-players'
    };
  });

  useEffect(() => {
    fetchActivePlayers();
  }, []);

  useEffect(() => {
    if (players.length > 0 && gameSetup.selectedPlayers.length === 0) {
      setGameSetup(prev => ({
        ...prev,
        selectedPlayers: players
      }));
    }
  }, [players, gameSetup.selectedPlayers.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameSetup', JSON.stringify(gameSetup));
    }
  }, [gameSetup]);

  const fetchActivePlayers = async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();
      const activePlayers = data.filter((p: Player) => p.active);
      setPlayers(activePlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (player: Player) => {
    const isSelected = gameSetup.selectedPlayers.some(p => p.id === player.id);

    if (isSelected) {
      setGameSetup(prev => ({
        ...prev,
        selectedPlayers: prev.selectedPlayers.filter(p => p.id !== player.id)
      }));
    } else {
      setGameSetup(prev => ({
        ...prev,
        selectedPlayers: [...prev.selectedPlayers, player]
      }));
    }
  };


  const selectKeeper = (player: Player, half: 1 | 2) => {
    if (half === 1) {
      setGameSetup(prev => ({ ...prev, keeper1: player }));
    } else {
      setGameSetup(prev => ({ ...prev, keeper2: player }));
    }
  };

  const proceedToPositions = () => {
    if (gameSetup.keeper1 && gameSetup.keeper2) {
      const remainingPlayers = gameSetup.selectedPlayers.filter(
        p => p.id !== gameSetup.keeper1?.id && p.id !== gameSetup.keeper2?.id
      );

      // Auto-assign default positions
      const defaultPositions: { [playerId: string]: string } = {
        [gameSetup.keeper1.id]: 'keeper',
        [gameSetup.keeper2.id]: 'substitute'
      };

      // Assign remaining players to field positions
      const fieldPositions = ['linksachter', 'rechtsachter', 'midden', 'linksvoor', 'rechtsvoor', 'substitute'];
      remainingPlayers.forEach((player, index) => {
        defaultPositions[player.id] = fieldPositions[index] || 'substitute';
      });

      setGameSetup(prev => ({
        ...prev,
        step: 'assign-positions',
        playerPositions: defaultPositions,
        positionGroups: {}
      }));
    }
  };


  const handlePlayerSwap = (playerId: string, _newPosition?: string) => {
    if (!swapMode.active) {
      // Don't allow moving keepers in position assignment step
      if (gameSetup.step === 'assign-positions' &&
          (playerId === gameSetup.keeper1?.id || playerId === gameSetup.keeper2?.id)) {
        alert('Keepers kunnen niet van positie worden gewisseld!');
        return;
      }

      // Start swap mode
      const currentPosition = Object.keys(gameSetup.playerPositions).find(pid => pid === playerId);
      const currentPos = currentPosition ? gameSetup.playerPositions[currentPosition] : '';

      setSwapMode({
        active: true,
        firstPlayer: { playerId, position: currentPos, group: 1 } // group doesn't matter in position step
      });
    } else {
      // Complete swap
      const firstPlayer = swapMode.firstPlayer!;

      if (firstPlayer.playerId === playerId) {
        // Clicked same player - cancel
        setSwapMode({ active: false, firstPlayer: null });
        return;
      }

      // Find current positions
      const firstPlayerCurrentPos = gameSetup.playerPositions[firstPlayer.playerId];
      const secondPlayerCurrentPos = gameSetup.playerPositions[playerId];

      // Swap positions
      setGameSetup(prev => ({
        ...prev,
        playerPositions: {
          ...prev.playerPositions,
          [firstPlayer.playerId]: secondPlayerCurrentPos,
          [playerId]: firstPlayerCurrentPos
        }
      }));

      setSwapMode({ active: false, firstPlayer: null });
    }
  };

  const handlePositionClick = (position: string) => {
    if (gameSetup.step === 'create-groups') {
      // Toggle group assignment
      setGameSetup(prev => {
        const currentGroup = prev.positionGroups[position] || 1;
        const newGroup = currentGroup === 1 ? 2 : 1;

        // Don't allow keeper to be moved from group 1
        if (position === 'keeper' && newGroup === 2) {
          return prev;
        }

        return {
          ...prev,
          positionGroups: {
            ...prev.positionGroups,
            [position]: newGroup
          }
        };
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }


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
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Wedstrijd Voorbereiding</h1>
            </div>
            <div className="text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
              Stap {gameSetup.step === 'select-players' ? '1' : gameSetup.step === 'select-keepers' ? '2' : gameSetup.step === 'assign-positions' ? '3' : '4'} van 4
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-3 px-3 sm:py-6 sm:px-6 lg:px-8">
        {/* Stap 1: Spelers selecteren */}
        {gameSetup.step === 'select-players' && (
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              Selecteer Spelers voor de Wedstrijd
            </h2>
            <p className="text-sm sm:text-base text-gray-900 font-medium mb-4 sm:mb-6">
              {gameSetup.selectedPlayers.length} spelers geselecteerd. Aantal bepaalt de wisselstrategie.
            </p>


            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-900">Spelers (klik om te deselecteren)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {players.map((player) => {
                const isSelected = gameSetup.selectedPlayers.some(p => p.id === player.id);

                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player)}
                    className={`p-2 sm:p-3 rounded border text-left transition-all shadow-sm ${
                      isSelected
                        ? 'bg-blue-200 border-blue-400 text-blue-900'
                        : 'bg-gray-100 border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm sm:text-base">{player.name}</div>
                      {isSelected && <div className="text-blue-700 font-bold text-lg">✓</div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {players.length === 0 && (
              <div className="text-center text-sm sm:text-base text-gray-900 font-medium py-6 sm:py-8 bg-gray-50 rounded-lg">
                Geen actieve spelers gevonden.
                <Link href="/players" className="text-blue-600 hover:text-blue-700 ml-1 font-bold underline">
                  Voeg eerst spelers toe
                </Link>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  const playerCount = gameSetup.selectedPlayers.length;
                  if (playerCount === 6) {
                    alert('Je hebt geen wissels vandaag dus ook geen strategie nodig');
                  } else if (playerCount === 7 || playerCount === 9) {
                    alert('Wisselstrategie voor dit aantal spelers volgt later');
                  } else if (playerCount >= 10) {
                    alert('Veel te veel wissels, reduceer aantal spelers');
                  } else if (playerCount === 8) {
                    setGameSetup(prev => ({ ...prev, step: 'select-keepers' }));
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition-all text-sm"
              >
                Volgende
              </button>
            </div>
          </div>
        )}

        {/* Stap 2: Keepers selecteren */}
        {gameSetup.step === 'select-keepers' && (
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Selecteer Keepers</h2>
            <p className="text-sm sm:text-base text-gray-900 mb-4 sm:mb-6 font-medium">
              Kies welke spelers keeper zijn in de eerste en tweede helft.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-gray-900">🥅 Keeper Eerste Helft</h3>
                {gameSetup.keeper1 ? (
                  <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 sm:p-4 text-center shadow-md">
                    <div className="font-bold text-gray-900 text-sm sm:text-base">{gameSetup.keeper1.name}</div>
                    {gameSetup.keeper1.number && <div className="text-xs sm:text-sm text-gray-700 font-medium">#{gameSetup.keeper1.number}</div>}
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, keeper1: null }))}
                      className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 font-bold text-xs sm:text-sm mt-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <div className="text-sm sm:text-base text-gray-700 font-medium border-2 border-dashed border-gray-400 rounded-lg p-3 sm:p-4 text-center bg-gray-50">
                    Selecteer een keeper
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-gray-900">🥅 Keeper Tweede Helft</h3>
                {gameSetup.keeper2 ? (
                  <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 sm:p-4 text-center shadow-md">
                    <div className="font-bold text-gray-900 text-sm sm:text-base">{gameSetup.keeper2.name}</div>
                    {gameSetup.keeper2.number && <div className="text-xs sm:text-sm text-gray-700 font-medium">#{gameSetup.keeper2.number}</div>}
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, keeper2: null }))}
                      className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 font-bold text-xs sm:text-sm mt-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <div className="text-sm sm:text-base text-gray-700 font-medium border-2 border-dashed border-gray-400 rounded-lg p-3 sm:p-4 text-center bg-gray-50">
                    Selecteer een keeper
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-900">Kies uit Geselecteerde Spelers</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {gameSetup.selectedPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    if (!gameSetup.keeper1) {
                      selectKeeper(player, 1);
                    } else if (!gameSetup.keeper2 && player.id !== gameSetup.keeper1.id) {
                      selectKeeper(player, 2);
                    }
                  }}
                  disabled={
                    (!!gameSetup.keeper1 && !!gameSetup.keeper2) ||
                    (gameSetup.keeper1?.id === player.id) ||
                    (gameSetup.keeper2?.id === player.id)
                  }
                  className={`p-2 sm:p-3 rounded-lg border-2 text-center transition-all shadow-md transform hover:scale-105 ${
                    gameSetup.keeper1?.id === player.id || gameSetup.keeper2?.id === player.id
                      ? 'bg-yellow-200 border-yellow-400 text-yellow-900'
                      : 'bg-white border-gray-300 hover:border-yellow-400 hover:bg-yellow-50 text-gray-900'
                  }`}
                >
                  <div className="font-bold text-xs sm:text-sm">{player.name}</div>
                  {player.number && <div className="text-xs text-gray-700 font-medium">#{player.number}</div>}
                </button>
              ))}
            </div>

            {gameSetup.keeper1 && gameSetup.keeper2 && (
              <div className="flex justify-between">
                <button
                  onClick={() => setGameSetup(prev => ({ ...prev, step: 'select-players' }))}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-bold transition-all text-sm"
                >
                  Vorige
                </button>
                <button
                  onClick={proceedToPositions}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition-all text-sm"
                >
                  Volgende
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stap 3: Posities Toewijzen */}
        {gameSetup.step === 'assign-positions' && (
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Posities Toewijzen</h2>
            <p className="text-sm sm:text-base text-gray-900 mb-4 sm:mb-6 font-medium">
              Klik op spelers om ze van positie te wisselen. Keepers kunnen niet worden verplaatst.
            </p>

            {/* Voetbalveld visualisatie */}
            <div className="bg-green-100 border-2 border-green-300 rounded-lg p-2 sm:p-4 mb-4 sm:mb-6">
              <div className="relative w-full max-w-[280px] mx-auto" style={{ aspectRatio: '2/2.2', minWidth: '240px' }}>
                {/* Veld */}
                <div className="w-full h-full bg-green-200 border-2 border-white rounded relative">
                  {/* Doelen */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>

                  {/* Render players based on position assignments */}
                  {(() => {
                    const getPlayerByPosition = (targetPosition: string) => {
                      const playerId = Object.keys(gameSetup.playerPositions).find(
                        pid => gameSetup.playerPositions[pid] === targetPosition
                      );
                      return playerId ? gameSetup.selectedPlayers.find(p => p.id === playerId) : null;
                    };

                    const positions = {
                      'keeper': { bottom: '4px', left: '50%', transform: 'translate(-50%, 0)', label: '🥅' },
                      'linksachter': { bottom: '20%', left: '15%', label: 'LA' },
                      'rechtsachter': { bottom: '20%', right: '15%', label: 'RA' },
                      'midden': { top: '45%', left: '50%', transform: 'translate(-50%, -50%)', label: 'M' },
                      'linksvoor': { top: '15%', left: '15%', label: 'LV' },
                      'rechtsvoor': { top: '15%', right: '15%', label: 'RV' }
                    };

                    return Object.entries(positions).map(([position, pos]) => {
                      const player = getPlayerByPosition(position);
                      if (!player) return null;

                      const isKeeper = position === 'keeper';
                      const isFirstSelected = swapMode.firstPlayer?.playerId === player.id;
                      const canMove = !isKeeper;

                      return (
                        <div
                          key={`${position}-${player.id}`}
                          className={`absolute ${canMove ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          style={pos}
                          onClick={() => canMove && handlePlayerSwap(player.id, position)}
                        >
                          <div className={`bg-gray-600 border-2 border-gray-800 rounded-full w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all ${canMove ? 'hover:scale-110' : ''} ${
                            isFirstSelected ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                          } ${
                            swapMode.active && canMove ? 'hover:ring-2 hover:ring-yellow-300' : ''
                          } ${
                            !canMove ? 'opacity-60' : ''
                          }`}>
                            {pos.label}
                          </div>
                          <div className={`text-xs text-center mt-1 font-bold text-gray-900 px-2 py-1 rounded shadow min-w-[60px] sm:min-w-[80px] ${
                            isFirstSelected ? 'bg-yellow-300' : 'bg-yellow-100'
                          }`}>
                            {player.name}
                          </div>
                        </div>
                      );
                    });
                  })()}

                </div>
              </div>

              {/* Wisselspelers */}
              <div className="mt-4 text-center">
                <div className="flex justify-center space-x-4 sm:space-x-6">
                  {Object.entries(gameSetup.playerPositions)
                    .filter(([, position]) => position === 'substitute')
                    .map(([playerId]) => {
                      const player = gameSetup.selectedPlayers.find(p => p.id === playerId);
                      if (!player) return null;

                      const isFirstSelected = swapMode.firstPlayer?.playerId === player.id;
                      const isKeeper2 = player.id === gameSetup.keeper2?.id;

                      return (
                        <div
                          key={playerId}
                          className={`text-center ${!isKeeper2 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          onClick={() => !isKeeper2 && handlePlayerSwap(player.id, 'substitute')}
                        >
                          <div className={`bg-gray-600 border-2 border-gray-800 rounded-full w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow mx-auto transition-all ${!isKeeper2 ? 'hover:scale-110' : ''} ${
                            isFirstSelected ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                          } ${
                            swapMode.active && !isKeeper2 ? 'hover:ring-2 hover:ring-yellow-300' : ''
                          } ${
                            isKeeper2 ? 'opacity-60' : ''
                          }`}>
                            {isKeeper2 ? 'K2' : 'W'}
                          </div>
                          <div className={`text-xs font-bold mt-1 text-gray-900 px-2 py-1 rounded shadow ${
                            isFirstSelected ? 'bg-yellow-300' : 'bg-yellow-100'
                          }`}>
                            {player.name}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setGameSetup(prev => ({ ...prev, step: 'select-keepers' }))}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-bold transition-all text-sm"
              >
                Vorige
              </button>
              <button
                onClick={() => {
                  // Initialize default groups: perfect 4-4 distribution
                  const defaultGroups: { [position: string]: 1 | 2 } = {
                    'keeper': 1,          // Groep 1: keeper
                    'linksachter': 1,     // Groep 1: linksachter
                    'linksvoor': 1,       // Groep 1: linksvoor
                    'substitute1': 1,     // Groep 1: substitute1 (keeper2) - locked
                    'rechtsachter': 2,    // Groep 2: rechtsachter
                    'midden': 2,          // Groep 2: midden
                    'rechtsvoor': 2,      // Groep 2: rechtsvoor
                    'substitute2': 2      // Groep 2: substitute2
                  };

                  setGameSetup(prev => ({
                    ...prev,
                    step: 'create-groups',
                    positionGroups: defaultGroups
                  }));
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition-all text-sm"
              >
                Volgende
              </button>
            </div>
          </div>
        )}

        {/* Stap 4: Groepen maken */}
        {gameSetup.step === 'create-groups' && (
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Groepen Maken</h2>
            <p className="text-sm sm:text-base text-gray-900 font-medium mb-4 sm:mb-6">
              Klik op posities om ze toe te wijzen aan groep 1 (blauw) of groep 2 (groen). Maak twee groepen van 4 spelers. Keepers blijven in groep 1.
            </p>


            {/* Voetbalveld visualisatie voor groepen */}
            <div className="bg-green-100 border-2 border-green-300 rounded-lg p-2 sm:p-4 mb-4 sm:mb-6">
              <div className="relative w-full max-w-[280px] mx-auto" style={{ aspectRatio: '2/2.2', minWidth: '240px' }}>
                {/* Veld */}
                <div className="w-full h-full bg-green-200 border-2 border-white rounded relative">
                  {/* Doelen */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>

                  {/* Render players with group colors */}
                  {(() => {
                    const getPlayerByPosition = (targetPosition: string) => {
                      const playerId = Object.keys(gameSetup.playerPositions).find(
                        pid => gameSetup.playerPositions[pid] === targetPosition
                      );
                      return playerId ? gameSetup.selectedPlayers.find(p => p.id === playerId) : null;
                    };

                    const positions = {
                      'keeper': { bottom: '4px', left: '50%', transform: 'translate(-50%, 0)', label: '🥅' },
                      'linksachter': { bottom: '20%', left: '15%', label: 'LA' },
                      'rechtsachter': { bottom: '20%', right: '15%', label: 'RA' },
                      'midden': { top: '45%', left: '50%', transform: 'translate(-50%, -50%)', label: 'M' },
                      'linksvoor': { top: '15%', left: '15%', label: 'LV' },
                      'rechtsvoor': { top: '15%', right: '15%', label: 'RV' }
                    };

                    const fieldPlayers = Object.entries(positions).map(([position, pos]) => {
                      const player = getPlayerByPosition(position);
                      if (!player) return null;

                      const group = gameSetup.positionGroups[position] || 1;
                      const isKeeper = position === 'keeper';
                      const canClick = !isKeeper;

                      const colorClasses = group === 1
                        ? 'bg-blue-500 border-blue-700'
                        : 'bg-green-500 border-green-700';

                      return (
                        <div
                          key={`${position}-${player.id}`}
                          className={`absolute ${canClick ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          style={pos}
                          onClick={() => canClick && handlePositionClick(position)}
                        >
                          <div className={`${colorClasses} border-2 rounded-full w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all ${canClick ? 'hover:scale-110' : ''} ${
                            !canClick ? 'opacity-60' : ''
                          }`}>
                            {pos.label}
                          </div>
                          <div className="text-xs text-center mt-1 font-bold text-gray-900 px-2 py-1 rounded shadow min-w-[60px] sm:min-w-[80px] bg-yellow-100">
                            {player.name}
                          </div>
                        </div>
                      );
                    });

                    return fieldPlayers;
                  })()}

                </div>
              </div>

              {/* Wisselspelers */}
              <div className="mt-4 text-center">
                <div className="flex justify-center space-x-4 sm:space-x-6">
                  {Object.entries(gameSetup.playerPositions)
                    .filter(([, position]) => position === 'substitute')
                    .map(([playerId], index) => {
                      const player = gameSetup.selectedPlayers.find(p => p.id === playerId);
                      if (!player) return null;

                      const isKeeper2 = player.id === gameSetup.keeper2?.id;
                      const substitutePosition = `substitute${index + 1}`;
                      const group = gameSetup.positionGroups[substitutePosition] || (isKeeper2 ? 1 : 2);

                      const colorClasses = group === 1
                        ? 'bg-blue-500 border-blue-700'
                        : 'bg-green-500 border-green-700';

                      return (
                        <div
                          key={playerId}
                          className={`text-center ${!isKeeper2 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          onClick={() => !isKeeper2 && handlePositionClick(substitutePosition)}
                        >
                          <div className={`${colorClasses} border-2 rounded-full w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow mx-auto transition-all ${!isKeeper2 ? 'hover:scale-110' : ''} ${
                            isKeeper2 ? 'opacity-60' : ''
                          }`}>
                            {isKeeper2 ? 'K2' : 'W'}
                          </div>
                          <div className="text-xs font-bold mt-1 text-gray-900 px-2 py-1 rounded shadow bg-yellow-100">
                            {player.name}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setGameSetup(prev => ({ ...prev, step: 'assign-positions' }))}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-bold transition-all text-sm"
              >
                Vorige
              </button>
              <button
                onClick={() => {
                  // Use same counting logic as disabled check
                  const allPositions = Object.entries(gameSetup.positionGroups);
                  const group1Count = allPositions.filter(([, group]) => group === 1).length;
                  const group2Count = allPositions.filter(([, group]) => group === 2).length;

                  if (group1Count === 4 && group2Count === 4) {
                    // Transform new data structure to format expected by live match page
                    const group1Players: Player[] = [];
                    const group2Players: Player[] = [];
                    const group1Positions: string[] = [];
                    const group2Positions: string[] = [];

                    // Distribute players and positions based on positionGroups
                    Object.entries(gameSetup.positionGroups).forEach(([position, group]) => {
                      if (group === 1) {
                        group1Positions.push(position);
                        // Find player for this position
                        const playerId = Object.keys(gameSetup.playerPositions).find(
                          pid => gameSetup.playerPositions[pid] === position
                        );
                        if (playerId) {
                          const player = gameSetup.selectedPlayers.find(p => p.id === playerId);
                          if (player) group1Players.push(player);
                        }
                      } else {
                        group2Positions.push(position);
                        // Find player for this position
                        const playerId = Object.keys(gameSetup.playerPositions).find(
                          pid => gameSetup.playerPositions[pid] === position
                        );
                        if (playerId) {
                          const player = gameSetup.selectedPlayers.find(p => p.id === playerId);
                          if (player) group2Players.push(player);
                        }
                      }
                    });

                    // Create backwards compatible match setup
                    const matchSetup = {
                      selectedPlayers: gameSetup.selectedPlayers,
                      keeper1: gameSetup.keeper1,
                      keeper2: gameSetup.keeper2,
                      group1: group1Players,
                      group2: group2Players,
                      group1Positions,
                      group2Positions,
                      timestamp: Date.now()
                    };

                    localStorage.setItem('currentMatch', JSON.stringify(matchSetup));
                    window.location.href = '/game/live';
                  }
                }}
disabled={(() => {
                  // Count all positions including keeper and substitutes
                  const allPositions = Object.entries(gameSetup.positionGroups);
                  const group1Count = allPositions.filter(([, group]) => group === 1).length;
                  const group2Count = allPositions.filter(([, group]) => group === 2).length;

                  return group1Count !== 4 || group2Count !== 4;
                })()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold transition-all text-sm"
              >
                Start Wedstrijd
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}