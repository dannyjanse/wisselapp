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
  const [gameSetup, setGameSetup] = useState<GameSetup>({
    selectedPlayers: [],
    keeper1: null,
    keeper2: null,
    group1: [],
    group2: [],
    group1Positions: [],
    group2Positions: [],
    step: 'select-players'
  });

  useEffect(() => {
    fetchActivePlayers();
  }, []);

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
    } else if (gameSetup.selectedPlayers.length < 8) {
      setGameSetup(prev => ({
        ...prev,
        selectedPlayers: [...prev.selectedPlayers, player]
      }));
    }
  };

  const proceedToKeepers = () => {
    if (gameSetup.selectedPlayers.length === 8) {
      setGameSetup(prev => ({ ...prev, step: 'select-keepers' }));
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
      setGameSetup(prev => ({ ...prev, step: 'create-groups' }));
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

  const movePlayerToGroup = (player: Player, toGroup: 1 | 2) => {
    const fromGroup1 = gameSetup.group1.some(p => p.id === player.id);
    const fromGroup2 = gameSetup.group2.some(p => p.id === player.id);

    if (toGroup === 1 && !fromGroup1) {
      setGameSetup(prev => ({
        ...prev,
        group1: [...prev.group1.filter(p => p.id !== gameSetup.keeper2?.id), player].slice(0, 4),
        group2: prev.group2.filter(p => p.id !== player.id)
      }));
    } else if (toGroup === 2 && !fromGroup2) {
      setGameSetup(prev => ({
        ...prev,
        group2: [...prev.group2.filter(p => p.id !== gameSetup.keeper1?.id), player].slice(0, 4),
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-bold text-lg">
                ← Terug
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Nieuwe Wedstrijd</h1>
            </div>
            <div className="text-sm font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
              Stap {gameSetup.step === 'select-players' ? '1' : gameSetup.step === 'select-keepers' ? '2' : gameSetup.step === 'create-groups' ? '3' : '4'} van 4
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stap 1: Spelers selecteren */}
        {gameSetup.step === 'select-players' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Selecteer 8 Spelers voor de Wedstrijd
            </h2>
            <p className="text-gray-900 font-medium mb-6">
              Kies {8 - gameSetup.selectedPlayers.length} {8 - gameSetup.selectedPlayers.length === 1 ? 'speler' : 'spelers'} om deel te nemen aan de wedstrijd.
            </p>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Geselecteerde Spelers ({gameSetup.selectedPlayers.length}/8)
                </h3>
                {gameSetup.selectedPlayers.length === 8 && (
                  <button
                    onClick={proceedToKeepers}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform hover:scale-105"
                  >
                    Verder naar Keepers →
                  </button>
                )}
              </div>

              {gameSetup.selectedPlayers.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {gameSetup.selectedPlayers.map((player) => (
                    <div key={player.id} className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3 text-center shadow-md">
                      <div className="font-bold text-gray-900">{player.name}</div>
                      {player.number && <div className="text-sm text-gray-700 font-medium">#{player.number}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-700 font-medium mb-4 text-center py-4 bg-gray-50 rounded-lg">Nog geen spelers geselecteerd</div>
              )}
            </div>

            <h3 className="text-lg font-bold mb-4 text-gray-900">Beschikbare Spelers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => {
                const isSelected = gameSetup.selectedPlayers.some(p => p.id === player.id);
                const canSelect = !isSelected && gameSetup.selectedPlayers.length < 8;

                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player)}
                    disabled={!isSelected && gameSetup.selectedPlayers.length >= 8}
                    className={`p-4 rounded-lg border-2 text-left transition-all transform shadow-md ${
                      isSelected
                        ? 'bg-blue-200 border-blue-400 text-blue-900 scale-95'
                        : canSelect
                        ? 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:scale-105 text-gray-900'
                        : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="font-bold">{player.name}</div>
                    {player.number && <div className="text-sm text-gray-700 font-medium">Rugnummer: {player.number}</div>}
                    {isSelected && <div className="text-sm text-blue-700 font-bold mt-1">✓ Geselecteerd</div>}
                  </button>
                );
              })}
            </div>

            {players.length === 0 && (
              <div className="text-center text-gray-900 font-medium py-8 bg-gray-50 rounded-lg">
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Selecteer Keepers</h2>
            <p className="text-gray-900 mb-6 font-medium">
              Kies welke spelers keeper zijn in de eerste en tweede helft.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-bold mb-3 text-gray-900">🥅 Keeper Eerste Helft</h3>
                {gameSetup.keeper1 ? (
                  <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 text-center shadow-md">
                    <div className="font-bold text-gray-900">{gameSetup.keeper1.name}</div>
                    {gameSetup.keeper1.number && <div className="text-sm text-gray-700 font-medium">#{gameSetup.keeper1.number}</div>}
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, keeper1: null }))}
                      className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 font-bold text-sm mt-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-700 font-medium border-2 border-dashed border-gray-400 rounded-lg p-4 text-center bg-gray-50">
                    Selecteer een keeper
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-gray-900">🥅 Keeper Tweede Helft</h3>
                {gameSetup.keeper2 ? (
                  <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 text-center shadow-md">
                    <div className="font-bold text-gray-900">{gameSetup.keeper2.name}</div>
                    {gameSetup.keeper2.number && <div className="text-sm text-gray-700 font-medium">#{gameSetup.keeper2.number}</div>}
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, keeper2: null }))}
                      className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 font-bold text-sm mt-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-700 font-medium border-2 border-dashed border-gray-400 rounded-lg p-4 text-center bg-gray-50">
                    Selecteer een keeper
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4 text-gray-900">Kies uit Geselecteerde Spelers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                  className={`p-3 rounded-lg border-2 text-center transition-all shadow-md transform hover:scale-105 ${
                    gameSetup.keeper1?.id === player.id
                      ? 'bg-blue-200 border-blue-400 text-blue-900'
                      : gameSetup.keeper2?.id === player.id
                      ? 'bg-green-200 border-green-400 text-green-900'
                      : 'bg-white border-gray-300 hover:border-yellow-400 hover:bg-yellow-50 text-gray-900'
                  }`}
                >
                  <div className="font-bold">{player.name}</div>
                  {player.number && <div className="text-sm text-gray-700 font-medium">#{player.number}</div>}
                </button>
              ))}
            </div>

            {gameSetup.keeper1 && gameSetup.keeper2 && (
              <div className="flex justify-end">
                <button
                  onClick={proceedToGroups}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  Verder naar Groepen →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stap 3: Groepen maken */}
        {gameSetup.step === 'create-groups' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Maak Wisselgroepen</h2>
            <p className="text-gray-900 mb-6 font-medium">
              Klik op de knoppen om spelers te verplaatsen tussen groepen. Groep 1 (blauw) bevat beide keepers + 2 veldspelers. Groep 2 (groen) bevat 4 veldspelers.
            </p>

            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={createRandomGroups}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all transform hover:scale-105"
              >
                🎲 Willekeurige Verdeling
              </button>
              <button
                onClick={() => setGameSetup(prev => ({ ...prev, group1: [prev.keeper1!, prev.keeper2!], group2: [] }))}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform hover:scale-105"
              >
                🥅 Start met Keepers in Groep 1
              </button>
            </div>

            {gameSetup.group1.length > 0 && gameSetup.group2.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 text-blue-800">
                      🔵 Groep 1 - Keepers + Veldspelers ({gameSetup.group1.length}/4)
                    </h3>
                    <div className="min-h-[200px] space-y-2">
                      {gameSetup.group1.map((player) => (
                        <div
                          key={player.id}
                          className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-md"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-gray-900">{player.name}</div>
                              {player.number && <div className="text-sm text-gray-700 font-medium">#{player.number}</div>}
                              {player.id === gameSetup.keeper1?.id && (
                                <div className="text-sm text-blue-700 font-bold">🥅 Keeper 1e helft</div>
                              )}
                              {player.id === gameSetup.keeper2?.id && (
                                <div className="text-sm text-blue-700 font-bold">🥅 Keeper 2e helft</div>
                              )}
                            </div>
                            {player.id !== gameSetup.keeper1?.id && player.id !== gameSetup.keeper2?.id && (
                              <button
                                onClick={() => movePlayerToGroup(player, 2)}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 font-bold text-sm transition-all transform hover:scale-105 shadow"
                              >
                                → Groep 2
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {gameSetup.group1.length === 0 && (
                        <div className="text-blue-600 text-center py-8 font-medium">
                          Nog geen spelers in deze groep
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 text-green-800">
                      🔴 Groep 2 - Veldspelers ({gameSetup.group2.length}/4)
                    </h3>
                    <div className="min-h-[200px] space-y-2">
                      {gameSetup.group2.map((player) => (
                        <div
                          key={player.id}
                          className="bg-white border-2 border-green-400 rounded-lg p-3 shadow-md"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-gray-900">{player.name}</div>
                              {player.number && <div className="text-sm text-gray-700 font-medium">#{player.number}</div>}
                              {player.id === gameSetup.keeper1?.id && (
                                <div className="text-sm text-green-700 font-bold">🥅 Keeper 1e helft</div>
                              )}
                              {player.id === gameSetup.keeper2?.id && (
                                <div className="text-sm text-green-700 font-bold">🥅 Keeper 2e helft</div>
                              )}
                            </div>
                            {player.id !== gameSetup.keeper1?.id && player.id !== gameSetup.keeper2?.id && (
                              <button
                                onClick={() => movePlayerToGroup(player, 1)}
                                className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 font-bold text-sm transition-all transform hover:scale-105 shadow"
                              >
                                → Groep 1
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {gameSetup.group2.length === 0 && (
                        <div className="text-green-600 text-center py-8 font-medium">
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
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform hover:scale-105"
                    >
                      Verder naar Posities →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Stap 4: Posities toewijzen per groep */}
        {gameSetup.step === 'assign-positions' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Posities Toewijzen</h2>
            <p className="text-gray-900 font-medium mb-6">
              Wijs 3 posities toe aan elke groep. Groep 1 (blauw) bevat beide keepers en krijgt automatisch de keeper positie.
            </p>

            {/* Beschikbare posities */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Beschikbare Posities (6v6)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                      className={`p-4 rounded-lg border-2 text-center shadow-md ${
                        position.locked
                          ? 'bg-blue-200 border-blue-400 text-blue-900'
                          : assignedToGroup1
                          ? 'bg-blue-200 border-blue-400 text-blue-900'
                          : assignedToGroup2
                          ? 'bg-green-200 border-green-400 text-green-900'
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-bold">{position.name}</div>
                      {position.locked && <div className="text-xs font-bold">🔵 Groep 1 (automatisch)</div>}
                      {assignedToGroup1 && !position.locked && <div className="text-xs font-bold">🔵 Groep 1</div>}
                      {assignedToGroup2 && <div className="text-xs font-bold">🔴 Groep 2</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Groep toewijzingen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Groep 1 */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3 text-blue-800">
                  🔵 Groep 1 - Keepers + Veldspelers ({gameSetup.group1Positions.length}/3 posities)
                </h3>
                <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="text-sm text-gray-900 font-bold mb-2">Spelers in deze groep:</div>
                    {gameSetup.group1.map((player) => (
                      <div key={player.id} className="text-sm font-medium text-gray-800">
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
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3 text-green-800">
                  🔴 Groep 2 - Veldspelers ({gameSetup.group2Positions.length}/3 posities)
                </h3>
                <div className="bg-white border border-green-200 rounded-lg p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="text-sm text-gray-900 font-bold mb-2">Spelers in deze groep:</div>
                    {gameSetup.group2.map((player) => (
                      <div key={player.id} className="text-sm font-medium text-gray-800">• {player.name}</div>
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

            <div className="flex justify-between">
              <button
                onClick={() => setGameSetup(prev => ({ ...prev, step: 'create-groups' }))}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-bold shadow-lg transition-all"
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
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold shadow-lg transition-all transform hover:scale-105"
              >
                Naar Formatie →
              </button>
            </div>
          </div>
        )}

        {/* Stap 5: Finale formatie weergave */}
        {gameSetup.step === 'formation' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Voetbalveld Opstelling</h2>
              <p className="text-gray-600 mb-6">
                Startopstelling: {gameSetup.keeper1?.name} keept. {gameSetup.keeper2?.name} start als wissel (speelt veldspeler in 2e helft).
              </p>

              {/* Voetbalveld visualisatie */}
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-8 mb-6">
                <div className="relative max-w-md mx-auto" style={{ aspectRatio: '2/3' }}>
                  {/* Veld */}
                  <div className="w-full h-full bg-green-200 border-2 border-white rounded relative">

                    {/* Doelen */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-white border border-gray-400"></div>

                    {/* Keeper (Groep 1) */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-blue-500 border-2 border-blue-700 rounded-full w-12 h-12 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        🥅
                      </div>
                      <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-white px-2 py-1 rounded shadow">
                        {gameSetup.keeper1?.name}
                      </div>
                    </div>

                    {/* Verdedigers (achterste lijn) - Group 1 players */}
                    <div className="absolute top-20 left-8">
                      <div className="bg-blue-500 border-2 border-blue-700 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        LA
                      </div>
                      <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-white px-1 py-0.5 rounded shadow w-16">
                        {gameSetup.group1.filter(p => p.id !== gameSetup.keeper1?.id)[0]?.name || 'Speler'}
                      </div>
                    </div>

                    <div className="absolute top-20 right-8">
                      <div className="bg-green-500 border-2 border-green-700 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        RA
                      </div>
                      <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-white px-1 py-0.5 rounded shadow w-16">
                        {gameSetup.group2[0]?.name || 'Speler'}
                      </div>
                    </div>

                    {/* Middenveld - Group 2 player */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-green-500 border-2 border-green-700 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        M
                      </div>
                      <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-white px-1 py-0.5 rounded shadow w-16">
                        {gameSetup.group2[1]?.name || 'Speler'}
                      </div>
                    </div>

                    {/* Aanvallers */}
                    <div className="absolute bottom-20 left-8">
                      <div className="bg-blue-500 border-2 border-blue-700 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        LV
                      </div>
                      <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-white px-1 py-0.5 rounded shadow w-16">
                        {gameSetup.group1.filter(p => p.id !== gameSetup.keeper1?.id)[1]?.name || 'Speler'}
                      </div>
                    </div>

                    <div className="absolute bottom-20 right-8">
                      <div className="bg-green-500 border-2 border-green-700 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        RV
                      </div>
                      <div className="text-xs text-center mt-1 font-bold text-gray-900 bg-white px-1 py-0.5 rounded shadow w-16">
                        {gameSetup.group2[2]?.name || 'Speler'}
                      </div>
                    </div>

                    {/* Wisselspelers (rechts van het veld) */}
                    <div className="absolute top-16 -right-24">
                      <div className="text-sm font-bold mb-2 text-gray-900">Wisselbank</div>
                      <div className="space-y-3">
                        {/* Keeper2 als wissel */}
                        <div className="text-center">
                          <div className="bg-blue-400 border-2 border-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-white shadow">
                            K2
                          </div>
                          <div className="text-xs font-bold w-16 mt-1 text-gray-900 bg-white px-1 py-0.5 rounded shadow">
                            {gameSetup.keeper2?.name}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">Groep 1</div>
                        </div>
                        {/* Veldspeler wissel uit groep 2 */}
                        <div className="text-center">
                          <div className="bg-green-400 border-2 border-green-600 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-white shadow">
                            W
                          </div>
                          <div className="text-xs font-bold w-16 mt-1 text-gray-900 bg-white px-1 py-0.5 rounded shadow">
                            {gameSetup.group2[3]?.name || 'Speler'}
                          </div>
                          <div className="text-xs text-green-600 font-medium">Groep 2</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Groep informatie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 text-blue-800">
                    👥 Groep 1 - Keepers + Veldspelers
                  </h3>
                  <div className="space-y-2">
                    {gameSetup.group1.map((player) => (
                      <div key={player.id} className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-900">{player.name}</span>
                            {player.number && <span className="text-gray-700 ml-2 font-medium">#{player.number}</span>}
                          </div>
                          <div className="text-sm font-bold text-blue-700">
                            {player.id === gameSetup.keeper1?.id ? '🥅 Keeper 1e helft' :
                             player.id === gameSetup.keeper2?.id ? '🥅 Keeper 2e helft (start wissel)' :
                             'Veldspeler'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                    <div className="text-sm font-bold text-blue-900">Toegewezen posities:</div>
                    <div className="text-sm font-medium text-blue-800">
                      {gameSetup.group1Positions.map(pos =>
                        pos === 'keeper' ? '🥅 Keeper' :
                        pos.charAt(0).toUpperCase() + pos.slice(1).replace(/([A-Z])/g, ' $1')
                      ).join(', ')}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-3 text-green-800">
                    👥 Groep 2 - Veldspelers
                  </h3>
                  <div className="space-y-2">
                    {gameSetup.group2.map((player, index) => (
                      <div key={player.id} className="bg-white border-2 border-green-400 rounded-lg p-3 shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-900">{player.name}</span>
                            {player.number && <span className="text-gray-700 ml-2 font-medium">#{player.number}</span>}
                          </div>
                          <div className="text-sm font-bold text-green-700">
                            {index === 3 ? 'Start wissel' : 'Veldspeler'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                    <div className="text-sm font-bold text-green-900">Toegewezen posities:</div>
                    <div className="text-sm font-medium text-green-800">
                      {gameSetup.group2Positions.map(pos =>
                        pos.charAt(0).toUpperCase() + pos.slice(1).replace(/([A-Z])/g, ' $1')
                      ).join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Uitleg wisselsysteem */}
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-6 mb-6 shadow-md">
                <h4 className="font-bold text-yellow-900 mb-3 text-lg">🔄 Wisselsysteem Uitleg</h4>
                <ul className="text-sm text-yellow-900 space-y-2 font-medium">
                  <li>• <strong>1e helft:</strong> {gameSetup.keeper1?.name} keept, {gameSetup.keeper2?.name} start als wissel</li>
                  <li>• <strong>2e helft:</strong> {gameSetup.keeper2?.name} keept, {gameSetup.keeper1?.name} start als wissel</li>
                  <li>• <span className="text-blue-700">🔵 Groep 1</span> wisselt over {gameSetup.group1Positions.length} posities, <span className="text-green-700">🔴 Groep 2</span> over {gameSetup.group2Positions.length} posities</li>
                  <li>• Elke 5 minuten wisselen binnen elke groep (3 op veld, 1 wissel per groep)</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setGameSetup(prev => ({ ...prev, step: 'create-groups' }))}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-bold shadow-lg transition-all"
                >
                  ← Terug
                </button>
                <button
                  onClick={() => alert('Wedstrijd starten komt in volgende update!')}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all transform hover:scale-105"
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