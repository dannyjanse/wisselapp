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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700">
                ← Terug
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Nieuwe Wedstrijd</h1>
            </div>
            <div className="text-sm text-gray-500">
              Stap {gameSetup.step === 'select-players' ? '1' : gameSetup.step === 'select-keepers' ? '2' : gameSetup.step === 'create-groups' ? '3' : '4'} van 4
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stap 1: Spelers selecteren */}
        {gameSetup.step === 'select-players' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Selecteer 8 Spelers voor de Wedstrijd
            </h2>
            <p className="text-gray-600 mb-6">
              Kies {8 - gameSetup.selectedPlayers.length} {8 - gameSetup.selectedPlayers.length === 1 ? 'speler' : 'spelers'} om deel te nemen aan de wedstrijd.
            </p>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  Geselecteerde Spelers ({gameSetup.selectedPlayers.length}/8)
                </h3>
                {gameSetup.selectedPlayers.length === 8 && (
                  <button
                    onClick={proceedToKeepers}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Verder naar Keepers →
                  </button>
                )}
              </div>

              {gameSetup.selectedPlayers.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {gameSetup.selectedPlayers.map((player) => (
                    <div key={player.id} className="bg-blue-100 border border-blue-200 rounded p-2 text-center">
                      <div className="font-medium">{player.name}</div>
                      {player.number && <div className="text-sm text-gray-600">#{player.number}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 mb-4">Nog geen spelers geselecteerd</div>
              )}
            </div>

            <h3 className="text-lg font-medium mb-4">Beschikbare Spelers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => {
                const isSelected = gameSetup.selectedPlayers.some(p => p.id === player.id);
                const canSelect = !isSelected && gameSetup.selectedPlayers.length < 8;

                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerSelection(player)}
                    disabled={!isSelected && gameSetup.selectedPlayers.length >= 8}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-100 border-blue-300 text-blue-900'
                        : canSelect
                        ? 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="font-medium">{player.name}</div>
                    {player.number && <div className="text-sm text-gray-600">Rugnummer: {player.number}</div>}
                    {isSelected && <div className="text-sm text-blue-600 mt-1">✓ Geselecteerd</div>}
                  </button>
                );
              })}
            </div>

            {players.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Geen actieve spelers gevonden.
                <Link href="/players" className="text-blue-600 hover:text-blue-700 ml-1">
                  Voeg eerst spelers toe
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Stap 2: Keepers selecteren */}
        {gameSetup.step === 'select-keepers' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Selecteer Keepers</h2>
            <p className="text-gray-600 mb-6">
              Kies welke spelers keeper zijn in de eerste en tweede helft.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Keeper Eerste Helft</h3>
                {gameSetup.keeper1 ? (
                  <div className="bg-green-100 border border-green-200 rounded p-4 text-center">
                    <div className="font-medium">{gameSetup.keeper1.name}</div>
                    {gameSetup.keeper1.number && <div className="text-sm text-gray-600">#{gameSetup.keeper1.number}</div>}
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, keeper1: null }))}
                      className="text-sm text-red-600 mt-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 border-2 border-dashed border-gray-300 rounded p-4 text-center">
                    Selecteer een keeper
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Keeper Tweede Helft</h3>
                {gameSetup.keeper2 ? (
                  <div className="bg-green-100 border border-green-200 rounded p-4 text-center">
                    <div className="font-medium">{gameSetup.keeper2.name}</div>
                    {gameSetup.keeper2.number && <div className="text-sm text-gray-600">#{gameSetup.keeper2.number}</div>}
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, keeper2: null }))}
                      className="text-sm text-red-600 mt-2"
                    >
                      Wijzigen
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 border-2 border-dashed border-gray-300 rounded p-4 text-center">
                    Selecteer een keeper
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-lg font-medium mb-4">Kies uit Geselecteerde Spelers</h3>
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
                  className={`p-3 rounded border text-center transition-colors ${
                    gameSetup.keeper1?.id === player.id || gameSetup.keeper2?.id === player.id
                      ? 'bg-green-100 border-green-300 text-green-900'
                      : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="font-medium">{player.name}</div>
                  {player.number && <div className="text-sm text-gray-600">#{player.number}</div>}
                </button>
              ))}
            </div>

            {gameSetup.keeper1 && gameSetup.keeper2 && (
              <div className="flex justify-end">
                <button
                  onClick={proceedToGroups}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Verder naar Groepen →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stap 3: Groepen maken */}
        {gameSetup.step === 'create-groups' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Maak Wisselgroepen</h2>
            <p className="text-gray-600 mb-6">
              Verdeel de 8 spelers in 2 groepen van 4. Elke groep bevat een keeper + 3 veldspelers.
            </p>

            <div className="mb-6">
              <button
                onClick={createRandomGroups}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                🎲 Willekeurige Groepen Maken
              </button>
            </div>

            {gameSetup.group1.length > 0 && gameSetup.group2.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-blue-600">
                      Startopstelling ({gameSetup.group1.length}/6)
                    </h3>
                    <div className="border-2 border-blue-300 rounded-lg p-4 min-h-[200px]">
                      {gameSetup.group1.map((player) => (
                        <div
                          key={player.id}
                          className="bg-blue-100 border border-blue-200 rounded p-3 mb-2 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">{player.name}</div>
                            {player.number && <div className="text-sm text-gray-600">#{player.number}</div>}
                            {player.id === gameSetup.keeper1?.id && (
                              <div className="text-sm text-blue-600">🥅 Keeper 1e helft</div>
                            )}
                            {player.id === gameSetup.keeper2?.id && (
                              <div className="text-sm text-green-600">🥅 Keeper 2e helft</div>
                            )}
                          </div>
                          {player.id !== gameSetup.keeper1?.id && player.id !== gameSetup.keeper2?.id && (
                            <button
                              onClick={() => movePlayerToGroup(player, 2)}
                              className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              → Groep 2
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3 text-green-600">
                      Wisselbank ({gameSetup.group2.length}/2)
                    </h3>
                    <div className="border-2 border-green-300 rounded-lg p-4 min-h-[200px]">
                      {gameSetup.group2.map((player) => (
                        <div
                          key={player.id}
                          className="bg-green-100 border border-green-200 rounded p-3 mb-2 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">{player.name}</div>
                            {player.number && <div className="text-sm text-gray-600">#{player.number}</div>}
                            {player.id === gameSetup.keeper1?.id && (
                              <div className="text-sm text-blue-600">🥅 Keeper 1e helft</div>
                            )}
                            {player.id === gameSetup.keeper2?.id && (
                              <div className="text-sm text-green-600">🥅 Keeper 2e helft</div>
                            )}
                          </div>
                          {player.id !== gameSetup.keeper1?.id && player.id !== gameSetup.keeper2?.id && (
                            <button
                              onClick={() => movePlayerToGroup(player, 1)}
                              className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              → Groep 1
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {gameSetup.group1.length === 4 && gameSetup.group2.length === 4 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setGameSetup(prev => ({ ...prev, step: 'assign-positions' }))}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Posities Toewijzen</h2>
            <p className="text-gray-600 mb-6">
              Wijs 3 posities toe aan elke groep. Groep 1 bevat beide keepers, dus krijgt automatisch de keeper positie.
            </p>

            {/* Beschikbare posities */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Beschikbare Posities (6v6)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      className={`p-3 rounded border text-center ${
                        position.locked
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : assignedToGroup1
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : assignedToGroup2
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="font-medium">{position.name}</div>
                      {position.locked && <div className="text-xs">Groep 1 (automatisch)</div>}
                      {assignedToGroup1 && !position.locked && <div className="text-xs">Groep 1</div>}
                      {assignedToGroup2 && <div className="text-xs">Groep 2</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Groep toewijzingen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Groep 1 */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-blue-600">
                  Groep 1 - Keepers + Veldspelers ({gameSetup.group1Positions.length}/3 posities)
                </h3>
                <div className="border-2 border-blue-300 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="text-sm text-gray-600 mb-2">Spelers in deze groep:</div>
                    {gameSetup.group1.map((player) => (
                      <div key={player.id} className="text-sm">
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
              <div>
                <h3 className="text-lg font-medium mb-3 text-green-600">
                  Groep 2 - Veldspelers ({gameSetup.group2Positions.length}/3 posities)
                </h3>
                <div className="border-2 border-green-300 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="text-sm text-gray-600 mb-2">Spelers in deze groep:</div>
                    {gameSetup.group2.map((player) => (
                      <div key={player.id} className="text-sm">• {player.name}</div>
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
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
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
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
                      <div className="bg-yellow-400 border-2 border-yellow-600 rounded-full w-12 h-12 flex items-center justify-center text-xs font-bold">
                        🥅
                      </div>
                      <div className="text-xs text-center mt-1 font-medium">
                        {gameSetup.keeper1?.name}
                      </div>
                    </div>

                    {/* Verdedigers (achterste lijn) */}
                    <div className="absolute top-20 left-8">
                      <div className="bg-blue-400 border-2 border-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                        LA
                      </div>
                      <div className="text-xs text-center mt-1 font-medium w-16">
                        {gameSetup.group1.filter(p => p.id !== gameSetup.keeper1?.id)[0]?.name || 'Speler'}
                      </div>
                    </div>

                    <div className="absolute top-20 right-8">
                      <div className="bg-blue-400 border-2 border-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                        RA
                      </div>
                      <div className="text-xs text-center mt-1 font-medium w-16">
                        {gameSetup.group1.filter(p => p.id !== gameSetup.keeper1?.id)[1]?.name || 'Speler'}
                      </div>
                    </div>

                    {/* Middenveld */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-blue-400 border-2 border-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                        M
                      </div>
                      <div className="text-xs text-center mt-1 font-medium w-16">
                        {gameSetup.group1.filter(p => p.id !== gameSetup.keeper1?.id)[2]?.name || 'Speler'}
                      </div>
                    </div>

                    {/* Aanvallers */}
                    <div className="absolute bottom-20 left-8">
                      <div className="bg-blue-400 border-2 border-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                        LV
                      </div>
                      <div className="text-xs text-center mt-1 font-medium w-16">
                        {gameSetup.group1.filter(p => p.id !== gameSetup.keeper1?.id)[3]?.name || 'Speler'}
                      </div>
                    </div>

                    <div className="absolute bottom-20 right-8">
                      <div className="bg-blue-400 border-2 border-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                        RV
                      </div>
                      <div className="text-xs text-center mt-1 font-medium w-16">
                        {gameSetup.group1.filter(p => p.id !== gameSetup.keeper1?.id)[4]?.name || 'Speler'}
                      </div>
                    </div>

                    {/* Wisselspelers (rechts van het veld) */}
                    <div className="absolute top-16 -right-24">
                      <div className="text-sm font-medium mb-2">Wisselbank</div>
                      <div className="space-y-3">
                        {/* Keeper2 als wissel */}
                        <div className="text-center">
                          <div className="bg-orange-300 border-2 border-orange-500 rounded-full w-8 h-8 flex items-center justify-center text-xs">
                            K2
                          </div>
                          <div className="text-xs font-medium w-16 mt-1">
                            {gameSetup.keeper2?.name}
                          </div>
                          <div className="text-xs text-gray-600">Groep 1</div>
                        </div>
                        {/* Veldspeler wissel uit groep 2 */}
                        <div className="text-center">
                          <div className="bg-gray-300 border-2 border-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-xs">
                            W
                          </div>
                          <div className="text-xs font-medium w-16 mt-1">
                            {gameSetup.group2[3]?.name || 'Speler'}
                          </div>
                          <div className="text-xs text-gray-600">Groep 2</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Groep informatie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium mb-3 text-blue-600">
                    👥 Groep 1 - Keepers + Veldspelers
                  </h3>
                  <div className="space-y-2">
                    {gameSetup.group1.map((player) => (
                      <div key={player.id} className="bg-blue-100 border border-blue-200 rounded p-2 flex justify-between">
                        <div>
                          <span className="font-medium">{player.name}</span>
                          {player.number && <span className="text-gray-600 ml-2">#{player.number}</span>}
                        </div>
                        <div className="text-sm text-blue-600">
                          {player.id === gameSetup.keeper1?.id ? '🥅 Keeper 1e helft' :
                           player.id === gameSetup.keeper2?.id ? '🥅 Keeper 2e helft (start wissel)' :
                           'Veldspeler'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium text-blue-800">Toegewezen posities:</div>
                    <div className="text-sm text-blue-600">
                      {gameSetup.group1Positions.map(pos =>
                        pos === 'keeper' ? '🥅 Keeper' :
                        pos.charAt(0).toUpperCase() + pos.slice(1).replace(/([A-Z])/g, ' $1')
                      ).join(', ')}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3 text-green-600">
                    👥 Groep 2 - Veldspelers
                  </h3>
                  <div className="space-y-2">
                    {gameSetup.group2.map((player, index) => (
                      <div key={player.id} className="bg-green-100 border border-green-200 rounded p-2 flex justify-between">
                        <div>
                          <span className="font-medium">{player.name}</span>
                          {player.number && <span className="text-gray-600 ml-2">#{player.number}</span>}
                        </div>
                        <div className="text-sm text-green-600">
                          {index === 3 ? 'Start wissel' : 'Veldspeler'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-green-50 rounded">
                    <div className="text-sm font-medium text-green-800">Toegewezen posities:</div>
                    <div className="text-sm text-green-600">
                      {gameSetup.group2Positions.map(pos =>
                        pos.charAt(0).toUpperCase() + pos.slice(1).replace(/([A-Z])/g, ' $1')
                      ).join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Uitleg wisselsysteem */}
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                <h4 className="font-medium text-yellow-800 mb-2">🔄 Wisselsysteem</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• <strong>1e helft:</strong> {gameSetup.keeper1?.name} keept, {gameSetup.keeper2?.name} start als wissel</li>
                  <li>• <strong>2e helft:</strong> {gameSetup.keeper2?.name} keept, {gameSetup.keeper1?.name} start als wissel</li>
                  <li>• Groep 1 wisselt over {gameSetup.group1Positions.length} posities, Groep 2 over {gameSetup.group2Positions.length} posities</li>
                  <li>• Elke 5 minuten wisselen binnen elke groep (3 op veld, 1 wissel per groep)</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setGameSetup(prev => ({ ...prev, step: 'create-groups' }))}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                >
                  ← Terug
                </button>
                <button
                  onClick={() => alert('Wedstrijd starten komt in volgende update!')}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
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