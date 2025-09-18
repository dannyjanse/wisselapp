'use client';

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
  group1: Player[]; // Groep 1 (2 keepers + 2 veldspelers)
  group2: Player[]; // Groep 2 (4 veldspelers)
  group1Positions: string[]; // 3 posities voor groep 1
  group2Positions: string[]; // 3 posities voor groep 2
  step: 'select-players' | 'select-keepers' | 'create-groups' | 'assign-positions' | 'formation';
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
      group1: [],
      group2: [],
      group1Positions: [],
      group2Positions: [],
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

  const proceedToKeepers = () => {
    const selectedCount = gameSetup.selectedPlayers.length;

    if (selectedCount === 8) {
      setGameSetup(prev => ({ ...prev, step: 'select-keepers' }));
    } else if (selectedCount === 6) {
      alert('6 spelers geselecteerd: geen wissels en dus geen wisselbeleid nodig.');
    } else if (selectedCount === 7 || selectedCount === 9) {
      alert('Wisselbeleid voor dit aantal spelers wordt nog ontwikkeld.');
    } else if (selectedCount >= 10) {
      alert('Dat zijn veel te veel wissels man, reduceer het aantal spelers.');
    }
  };

  const selectKeeper = (player: Player, half: 1 | 2) => {
    if (half === 1) {
      setGameSetup(prev => ({ ...prev, keeper1: player }));
    } else {
      setGameSetup(prev => ({ ...prev, keeper2: player }));
    }
  };

  const proceedToGroups = () => {
    if (gameSetup.keeper1 && gameSetup.keeper2) {
      const remainingPlayers = gameSetup.selectedPlayers.filter(
        p => p.id !== gameSetup.keeper1?.id && p.id !== gameSetup.keeper2?.id
      );

      // Default verdeling: beide keepers + 2 veldspelers in groep 1, rest in groep 2
      const group1 = [gameSetup.keeper1, gameSetup.keeper2, ...remainingPlayers.slice(0, 2)];
      const group2 = remainingPlayers.slice(2, 6);

      // Auto-assign posities
      const group1Positions = ['keeper', 'linksachter', 'linksvoor'];
      const group2Positions = ['rechtsachter', 'midden', 'rechtsvoor'];

      setGameSetup(prev => ({
        ...prev,
        step: 'create-groups',
        group1,
        group2,
        group1Positions,
        group2Positions
      }));
    }
  };

  const createRandomGroups = () => {
    const remainingPlayers = gameSetup.selectedPlayers.filter(
      p => p.id !== gameSetup.keeper1?.id && p.id !== gameSetup.keeper2?.id
    );

    // Shuffle array
    const shuffled = [...remainingPlayers].sort(() => Math.random() - 0.5);

    // Groep 1: beide keepers + 2 veldspelers (4 personen)
    const group1 = [gameSetup.keeper1!, gameSetup.keeper2!, ...shuffled.slice(0, 2)];
    // Groep 2: overige 4 veldspelers
    const group2 = shuffled.slice(2, 6);

    setGameSetup(prev => ({
      ...prev,
      group1,
      group2,
      step: 'assign-positions'
    }));
  };

  const handlePlayerSwap = (playerId: string, position: string, groupNumber: number) => {
    if (!swapMode.active) {
      // Start swap mode
      setSwapMode({
        active: true,
        firstPlayer: { playerId, position, group: groupNumber }
      });
    } else {
      // Complete swap
      const firstPlayer = swapMode.firstPlayer!;

      // Only allow swapping within same group
      if (firstPlayer.group !== groupNumber) {
        alert('Je kunt alleen spelers binnen dezelfde groep wisselen!');
        setSwapMode({ active: false, firstPlayer: null });
        return;
      }

      if (firstPlayer.playerId === playerId) {
        // Clicked same player - cancel
        setSwapMode({ active: false, firstPlayer: null });
        return;
      }

      // Perform the swap
      setGameSetup(prev => {
        const isGroup1 = groupNumber === 1;
        const positions = isGroup1 ? [...prev.group1Positions] : [...prev.group2Positions];

        const firstIndex = positions.indexOf(firstPlayer.position);
        const secondIndex = positions.indexOf(position);

        if (firstIndex !== -1 && secondIndex !== -1) {
          // Swap positions
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

  const movePlayerToGroup = (player: Player, toGroup: 1 | 2) => {
    const fromGroup1 = gameSetup.group1.some(p => p.id === player.id);
    const fromGroup2 = gameSetup.group2.some(p => p.id === player.id);

    if (toGroup === 1 && !fromGroup1) {
      setGameSetup(prev => ({
        ...prev,
        group1: [...prev.group1, player],
        group2: prev.group2.filter(p => p.id !== player.id)
      }));
    } else if (toGroup === 2 && !fromGroup2) {
      setGameSetup(prev => ({
        ...prev,
        group2: [...prev.group2, player],
        group1: prev.group1.filter(p => p.id !== player.id)
      }));
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
      <header className="bg-white shadow-lg border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-bold text-sm sm:text-lg">
                ← Terug
              </Link>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Nieuwe Wedstrijd</h1>
            </div>
            <div className="text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
              Stap {gameSetup.step === 'select-players' ? '1' : gameSetup.step === 'select-keepers' ? '2' : gameSetup.step === 'create-groups' ? '3' : '4'} van 4
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

            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Geselecteerde Spelers ({gameSetup.selectedPlayers.length})
                </h3>
                <button
                  onClick={proceedToKeepers}
                  className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
                >
                  Verder naar Stap 2/4 →
                </button>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-900">Spelers (klik om te deselecteren)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {players.map((player) => {
                const isSelected = gameSetup.selectedPlayers.some(p => p.id === player.id);

                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player)}
                    className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all transform shadow-md ${
                      isSelected
                        ? 'bg-blue-200 border-blue-400 text-blue-900 scale-95'
                        : 'bg-gray-100 border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-bold text-sm sm:text-base">{player.name}</div>
                    {isSelected && <div className="text-xs sm:text-sm text-blue-700 font-bold mt-1">✓ Geselecteerd</div>}
                    {!isSelected && <div className="text-xs sm:text-sm text-gray-600 font-medium mt-1">Gedeselecteerd</div>}
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
                  <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 sm:p-4 text-center shadow-md">
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
                  <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 sm:p-4 text-center shadow-md">
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
                    gameSetup.keeper1?.id === player.id
                      ? 'bg-blue-200 border-blue-400 text-blue-900'
                      : gameSetup.keeper2?.id === player.id
                      ? 'bg-green-200 border-green-400 text-green-900'
                      : 'bg-white border-gray-300 hover:border-yellow-400 hover:bg-yellow-50 text-gray-900'
                  }`}
                >
                  <div className="font-bold text-xs sm:text-sm">{player.name}</div>
                  {player.number && <div className="text-xs text-gray-700 font-medium">#{player.number}</div>}
                </button>
              ))}
            </div>

            {gameSetup.keeper1 && gameSetup.keeper2 && (
              <div className="flex justify-end">
                <button
                  onClick={proceedToGroups}
                  className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
                >
                  Verder naar Groepen →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stap 3: Groepen maken */}
        {gameSetup.step === 'create-groups' && (
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Maak Wisselgroepen</h2>
            <p className="text-sm sm:text-base text-gray-900 mb-4 sm:mb-6 font-medium">
              Klik op de knoppen om spelers te verplaatsen tussen groepen. Groep 1 (blauw) bevat beide keepers + 2 veldspelers. Groep 2 (groen) bevat 4 veldspelers.
            </p>


            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-blue-800">
                      🔵 Groep 1 - Keepers + Veldspelers ({gameSetup.group1.length}/4)
                    </h3>
                    <div className="min-h-[150px] sm:min-h-[200px] space-y-2">
                      {gameSetup.group1.map((player) => (
                        <div
                          key={player.id}
                          className="bg-white border-2 border-blue-400 rounded-lg p-2 sm:p-3 shadow-md"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-gray-900 text-sm sm:text-base">{player.name}</div>
                              {player.number && <div className="text-xs sm:text-sm text-gray-700 font-medium">#{player.number}</div>}
                              {player.id === gameSetup.keeper1?.id && (
                                <div className="text-xs sm:text-sm text-blue-700 font-bold">🥅 Keeper 1e helft</div>
                              )}
                              {player.id === gameSetup.keeper2?.id && (
                                <div className="text-xs sm:text-sm text-blue-700 font-bold">🥅 Keeper 2e helft</div>
                              )}
                            </div>
                            {player.id !== gameSetup.keeper1?.id && player.id !== gameSetup.keeper2?.id && (
                              <button
                                onClick={() => movePlayerToGroup(player, 2)}
                                className="bg-green-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-lg hover:bg-green-700 font-bold text-xs sm:text-sm transition-all transform hover:scale-105 shadow"
                              >
                                → Groep 2
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {gameSetup.group1.length === 0 && (
                        <div className="text-sm sm:text-base text-blue-600 text-center py-6 sm:py-8 font-medium">
                          Nog geen spelers in deze groep
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-green-800">
                      🔴 Groep 2 - Veldspelers ({gameSetup.group2.length}/4)
                    </h3>
                    <div className="min-h-[150px] sm:min-h-[200px] space-y-2">
                      {gameSetup.group2.map((player) => (
                        <div
                          key={player.id}
                          className="bg-white border-2 border-green-400 rounded-lg p-2 sm:p-3 shadow-md"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-gray-900 text-sm sm:text-base">{player.name}</div>
                              {player.number && <div className="text-xs sm:text-sm text-gray-700 font-medium">#{player.number}</div>}
                              {player.id === gameSetup.keeper1?.id && (
                                <div className="text-xs sm:text-sm text-green-700 font-bold">🥅 Keeper 1e helft</div>
                              )}
                              {player.id === gameSetup.keeper2?.id && (
                                <div className="text-xs sm:text-sm text-green-700 font-bold">🥅 Keeper 2e helft</div>
                              )}
                            </div>
                            {player.id !== gameSetup.keeper1?.id && player.id !== gameSetup.keeper2?.id && (
                              <button
                                onClick={() => movePlayerToGroup(player, 1)}
                                className="bg-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-lg hover:bg-blue-700 font-bold text-xs sm:text-sm transition-all transform hover:scale-105 shadow"
                              >
                                → Groep 1
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {gameSetup.group2.length === 0 && (
                        <div className="text-sm sm:text-base text-green-600 text-center py-6 sm:py-8 font-medium">
                          Nog geen spelers in deze groep
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {gameSetup.group1.length === 4 && gameSetup.group2.length === 4 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, step: 'assign-positions' }))}
                      className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
                    >
                      Verder naar Posities →
                    </button>
                  </div>
                )}
            </>
          </div>
        )}

        {/* Stap 4: Posities toewijzen per groep */}
        {gameSetup.step === 'assign-positions' && (
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Posities Toewijzen</h2>
            <p className="text-sm sm:text-base text-gray-900 font-medium mb-4 sm:mb-6">
              Wijs 3 posities toe aan elke groep. Groep 1 (blauw) bevat beide keepers en krijgt automatisch de keeper positie.
            </p>

            {/* Beschikbare posities */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-900">Beschikbare Posities (6v6)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                {[
                  { id: 'keeper', name: 'Keeper 🥅', locked: true, group: 1 },
                  { id: 'linksachter', name: 'Links Achter', locked: false, group: null },
                  { id: 'rechtsachter', name: 'Rechts Achter', locked: false, group: null },
                  { id: 'midden', name: 'Midden', locked: false, group: null },
                  { id: 'linksvoor', name: 'Links Voor', locked: false, group: null },
                  { id: 'rechtsvoor', name: 'Rechts Voor', locked: false, group: null }
                ].map((position) => {
                  const assignedToGroup1 = gameSetup.group1Positions.includes(position.id);
                  const assignedToGroup2 = gameSetup.group2Positions.includes(position.id);
                  const isAssigned = assignedToGroup1 || assignedToGroup2;

                  return (
                    <div
                      key={position.id}
                      className={`p-2 sm:p-4 rounded-lg border-2 text-center shadow-md ${
                        position.locked
                          ? 'bg-blue-200 border-blue-400 text-blue-900'
                          : assignedToGroup1
                          ? 'bg-blue-200 border-blue-400 text-blue-900'
                          : assignedToGroup2
                          ? 'bg-green-200 border-green-400 text-green-900'
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{position.name}</div>
                      {position.locked && <div className="text-xs font-bold">🔵 Groep 1 (automatisch)</div>}
                      {assignedToGroup1 && !position.locked && <div className="text-xs font-bold">🔵 Groep 1</div>}
                      {assignedToGroup2 && <div className="text-xs font-bold">🔴 Groep 2</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Groep toewijzingen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
              {/* Groep 1 */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-blue-800">
                  🔵 Groep 1 - Keepers + Veldspelers ({gameSetup.group1Positions.length}/3 posities)
                </h3>
                <div className="bg-white border border-blue-200 rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="text-xs sm:text-sm text-gray-900 font-bold mb-2">Spelers in deze groep:</div>
                    {gameSetup.group1.map((player) => (
                      <div key={player.id} className="text-xs sm:text-sm font-medium text-gray-800">
                        • {player.name}
                        {player.id === gameSetup.keeper1?.id && ' (Keeper 1e helft)'}
                        {player.id === gameSetup.keeper2?.id && ' (Keeper 2e helft)'}
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-gray-600 mb-2">Toegewezen posities:</div>
                  <div className="space-y-1">
                    <div className="text-sm bg-blue-100 p-2 rounded">🥅 Keeper (automatisch)</div>
                    {['linksachter', 'rechtsachter', 'midden', 'linksvoor', 'rechtsvoor']
                      .filter(pos => !gameSetup.group1Positions.includes(pos) && !gameSetup.group2Positions.includes(pos))
                      .slice(0, 2)
                      .map((position) => (
                        <button
                          key={position}
                          onClick={() => {
                            if (gameSetup.group1Positions.length < 3) {
                              setGameSetup(prev => ({
                                ...prev,
                                group1Positions: [...prev.group1Positions, position]
                              }));
                            }
                          }}
                          disabled={gameSetup.group1Positions.length >= 3}
                          className="w-full text-left text-sm bg-gray-50 hover:bg-blue-50 p-2 rounded border"
                        >
                          + {position.charAt(0).toUpperCase() + position.slice(1).replace(/([A-Z])/g, ' $1')}
                        </button>
                      ))}

                    {gameSetup.group1Positions.filter(pos => pos !== 'keeper').map((position) => (
                      <div key={position} className="text-sm bg-blue-100 p-2 rounded flex justify-between items-center">
                        {position.charAt(0).toUpperCase() + position.slice(1).replace(/([A-Z])/g, ' $1')}
                        <button
                          onClick={() => {
                            setGameSetup(prev => ({
                              ...prev,
                              group1Positions: prev.group1Positions.filter(p => p !== position)
                            }));
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Groep 2 */}
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-green-800">
                  🔴 Groep 2 - Veldspelers ({gameSetup.group2Positions.length}/3 posities)
                </h3>
                <div className="bg-white border border-green-200 rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="text-xs sm:text-sm text-gray-900 font-bold mb-2">Spelers in deze groep:</div>
                    {gameSetup.group2.map((player) => (
                      <div key={player.id} className="text-xs sm:text-sm font-medium text-gray-800">• {player.name}</div>
                    ))}
                  </div>

                  <div className="text-sm text-gray-600 mb-2">Toegewezen posities:</div>
                  <div className="space-y-1">
                    {['linksachter', 'rechtsachter', 'midden', 'linksvoor', 'rechtsvoor']
                      .filter(pos => !gameSetup.group1Positions.includes(pos) && !gameSetup.group2Positions.includes(pos))
                      .slice(0, 3)
                      .map((position) => (
                        <button
                          key={position}
                          onClick={() => {
                            if (gameSetup.group2Positions.length < 3) {
                              setGameSetup(prev => ({
                                ...prev,
                                group2Positions: [...prev.group2Positions, position]
                              }));
                            }
                          }}
                          disabled={gameSetup.group2Positions.length >= 3}
                          className="w-full text-left text-sm bg-gray-50 hover:bg-green-50 p-2 rounded border"
                        >
                          + {position.charAt(0).toUpperCase() + position.slice(1).replace(/([A-Z])/g, ' $1')}
                        </button>
                      ))}

                    {gameSetup.group2Positions.map((position) => (
                      <div key={position} className="text-sm bg-green-100 p-2 rounded flex justify-between items-center">
                        {position.charAt(0).toUpperCase() + position.slice(1).replace(/([A-Z])/g, ' $1')}
                        <button
                          onClick={() => {
                            setGameSetup(prev => ({
                              ...prev,
                              group2Positions: prev.group2Positions.filter(p => p !== position)
                            }));
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
              <button
                onClick={() => setGameSetup(prev => ({ ...prev, step: 'create-groups' }))}
                className="bg-gray-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-gray-700 font-bold shadow-lg transition-all text-sm sm:text-base order-2 sm:order-1"
              >
                ← Terug
              </button>
              <button
                onClick={() => {
                  if (gameSetup.group1Positions.length >= 2 && gameSetup.group2Positions.length >= 3) {
                    setGameSetup(prev => ({
                      ...prev,
                      group1Positions: ['keeper', ...prev.group1Positions.filter(p => p !== 'keeper')],
                      step: 'formation'
                    }));
                  }
                }}
                disabled={gameSetup.group1Positions.length < 2 || gameSetup.group2Positions.length < 3}
                className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base order-1 sm:order-2"
              >
                Naar Formatie →
              </button>
            </div>
          </div>
        )}

        {/* Stap 5: Finale formatie weergave */}
        {gameSetup.step === 'formation' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Voetbalveld Opstelling</h2>
              <p className="text-sm sm:text-base text-gray-900 font-medium mb-4 sm:mb-6">
                Startopstelling: {gameSetup.keeper1?.name} keept. {gameSetup.keeper2?.name} start als wissel (speelt veldspeler in 2e helft).
              </p>

              {/* Voetbalveld visualisatie */}
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-2 sm:p-4 mb-4 sm:mb-6">
                <div className="relative w-full max-w-[280px] sm:max-w-[320px] mx-auto" style={{ aspectRatio: '2/3', minWidth: '240px' }}>
                  {/* Veld */}
                  <div className="w-full h-full bg-green-200 border-2 border-white rounded relative">

                    {/* Doelen */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>

                    {/* Render players based on position assignments */}
                    {(() => {
                      const getPlayerByPosition = (group: Player[], positions: string[], targetPosition: string) => {
                        const posIndex = positions.indexOf(targetPosition);
                        if (posIndex === -1) return null;

                        if (targetPosition === 'keeper') {
                          return gameSetup.keeper1;
                        }

                        const nonKeepers = group.filter(p => p.id !== gameSetup.keeper1?.id && p.id !== gameSetup.keeper2?.id);
                        const adjustedIndex = targetPosition === 'keeper' ? -1 : positions.slice(0, posIndex).filter(p => p !== 'keeper').length;
                        return nonKeepers[adjustedIndex] || null;
                      };

                      return (
                        <>
                          {/* Keeper - altijd onderaan */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                            <div className="bg-blue-500 border-2 border-blue-700 rounded-full w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                              🥅
                            </div>
                            <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-yellow-100 px-2 py-1 rounded shadow min-w-[60px] sm:min-w-[80px]">
                              {gameSetup.keeper1?.name || 'Keeper'}
                            </div>
                          </div>

                          {/* Dynamically position other players based on their assigned positions */}
                          {gameSetup.group1Positions.concat(gameSetup.group2Positions).map((position, index) => {
                            if (position === 'keeper') return null;

                            const isGroup1Position = gameSetup.group1Positions.includes(position);
                            const player = getPlayerByPosition(
                              isGroup1Position ? gameSetup.group1 : gameSetup.group2,
                              isGroup1Position ? gameSetup.group1Positions : gameSetup.group2Positions,
                              position
                            );

                            if (!player) return null;

                            const color = isGroup1Position ? 'blue' : 'green';
                            const positions = {
                              'linksachter': { bottom: '20%', left: '15%', label: 'LA' },
                              'rechtsachter': { bottom: '20%', right: '15%', label: 'RA' },
                              'midden': { top: '45%', left: '50%', transform: 'translate(-50%, -50%)', label: 'M' },
                              'linksvoor': { top: '15%', left: '15%', label: 'LV' },
                              'rechtsvoor': { top: '15%', right: '15%', label: 'RV' }
                            };

                            const pos = positions[position as keyof typeof positions];
                            if (!pos) return null;

                            const playerColorClasses = isGroup1Position
                              ? 'bg-blue-500 border-blue-700'
                              : 'bg-green-500 border-green-700';

                            const isFirstSelected = swapMode.firstPlayer?.playerId === player.id;
                            const groupNumber = isGroup1Position ? 1 : 2;

                            return (
                              <div
                                key={`${position}-${player.id}`}
                                className="absolute cursor-pointer"
                                style={pos}
                                onClick={() => handlePlayerSwap(player.id, position, groupNumber)}
                              >
                                <div className={`${playerColorClasses} border-2 rounded-full w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all hover:scale-110 ${
                                  isFirstSelected ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                                } ${
                                  swapMode.active ? 'hover:ring-2 hover:ring-yellow-300' : ''
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
                          })}
                        </>
                      );
                    })()}

                  </div>
                </div>

                {/* Wisselspelers - Nu onder het veld */}
                <div className="mt-4 text-center">
                  <div className="text-sm font-bold mb-2 text-gray-900">Wisselbank</div>
                  <div className="flex justify-center space-x-4 sm:space-x-6">
                    {/* Keeper2 als wissel */}
                    <div className="text-center">
                      <div className="bg-blue-400 border-2 border-blue-600 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow mx-auto">
                        K2
                      </div>
                      <div className="text-xs font-bold mt-1 text-gray-900 bg-yellow-100 px-2 py-1 rounded shadow">
                        {gameSetup.keeper2?.name || 'Keeper 2'}
                      </div>
                      <div className="text-xs text-blue-600 font-medium">Groep 1</div>
                    </div>
                    {/* Veldspeler wissel uit groep 2 */}
                    <div className="text-center">
                      <div className="bg-green-500 border-2 border-green-700 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-xs font-bold text-white shadow mx-auto">
                        W
                      </div>
                      <div className="text-xs font-bold mt-1 text-gray-900 bg-yellow-100 px-2 py-1 rounded shadow">
                        {gameSetup.group2.filter(p => p.id !== gameSetup.keeper1?.id && p.id !== gameSetup.keeper2?.id)[3]?.name || 'Wissel'}
                      </div>
                      <div className="text-xs text-green-600 font-medium">Groep 2</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Groep informatie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-blue-800">
                    👥 Groep 1 - Keepers + Veldspelers
                  </h3>
                  <div className="space-y-2">
                    {gameSetup.group1.map((player) => (
                      <div key={player.id} className="bg-white border-2 border-blue-400 rounded-lg p-2 sm:p-3 shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">{player.name}</span>
                            {player.number && <span className="text-gray-700 ml-1 sm:ml-2 font-medium text-xs">#{player.number}</span>}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-blue-700">
                            {player.id === gameSetup.keeper1?.id ? '🥅 Keeper 1e' :
                             player.id === gameSetup.keeper2?.id ? '🥅 Keeper 2e' :
                             'Veldspeler'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-100 border border-blue-300 rounded-lg">
                    <div className="text-xs sm:text-sm font-bold text-blue-900">Toegewezen posities:</div>
                    <div className="text-xs sm:text-sm font-medium text-blue-800">
                      {gameSetup.group1Positions.map(pos =>
                        pos === 'keeper' ? '🥅 Keeper' :
                        pos.charAt(0).toUpperCase() + pos.slice(1).replace(/([A-Z])/g, ' $1')
                      ).join(', ')}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-green-800">
                    👥 Groep 2 - Veldspelers
                  </h3>
                  <div className="space-y-2">
                    {gameSetup.group2.map((player, index) => (
                      <div key={player.id} className="bg-white border-2 border-green-400 rounded-lg p-2 sm:p-3 shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">{player.name}</span>
                            {player.number && <span className="text-gray-700 ml-1 sm:ml-2 font-medium text-xs">#{player.number}</span>}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-green-700">
                            {index === 3 ? 'Start wissel' : 'Veldspeler'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-green-100 border border-green-300 rounded-lg">
                    <div className="text-xs sm:text-sm font-bold text-green-900">Toegewezen posities:</div>
                    <div className="text-xs sm:text-sm font-medium text-green-800">
                      {gameSetup.group2Positions.map(pos =>
                        pos.charAt(0).toUpperCase() + pos.slice(1).replace(/([A-Z])/g, ' $1')
                      ).join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Uitleg wisselsysteem */}
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 sm:p-6 mb-4 sm:mb-6 shadow-md">
                <h4 className="font-bold text-yellow-900 mb-2 sm:mb-3 text-base sm:text-lg">🔄 Wisselsysteem Uitleg</h4>
                <ul className="text-xs sm:text-sm text-yellow-900 space-y-1 sm:space-y-2 font-medium">
                  <li>• <strong>1e helft:</strong> {gameSetup.keeper1?.name} keept, {gameSetup.keeper2?.name} start als wissel</li>
                  <li>• <strong>2e helft:</strong> {gameSetup.keeper2?.name} keept, {gameSetup.keeper1?.name} start als wissel</li>
                  <li>• <span className="text-blue-700">🔵 Groep 1</span> wisselt over {gameSetup.group1Positions.length} posities, <span className="text-green-700">🔴 Groep 2</span> over {gameSetup.group2Positions.length} posities</li>
                  <li>• Elke 5 minuten wisselen binnen elke groep (3 op veld, 1 wissel per groep)</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
                <button
                  onClick={() => setGameSetup(prev => ({ ...prev, step: 'create-groups' }))}
                  className="bg-gray-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-gray-700 font-bold shadow-lg transition-all text-sm sm:text-base order-2 sm:order-1"
                >
                  ← Terug
                </button>
                <button
                  onClick={() => alert('Wedstrijd starten komt in volgende update!')}
                  className="bg-green-600 text-white px-6 py-2 sm:px-8 sm:py-3 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base order-1 sm:order-2"
                >
                  🚀 Wedstrijd Starten
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}