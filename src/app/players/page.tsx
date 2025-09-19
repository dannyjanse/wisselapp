'use client';
import Image from 'next/image';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  number: number | null;
  active: boolean;
  createdAt: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '' });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayer.name.trim()) return;

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlayer.name.trim(),
        }),
      });

      if (response.ok) {
        setNewPlayer({ name: '' });
        setShowAddForm(false);
        fetchPlayers();
      }
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };


  const deletePlayer = async (playerId: string) => {
    if (!confirm('Weet je zeker dat je deze speler wilt verwijderen?')) return;

    try {
      await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
      fetchPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
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
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700 font-bold text-lg sm:text-xl transition-colors">
                <Image
                  src="/logo wisselapp"
                  alt="Wisselapp Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </Link>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Spelers Beheren</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all text-sm sm:text-base"
            >
              + Nieuwe Speler
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Nieuwe Speler Toevoegen</h2>
            <form onSubmit={addPlayer} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Speler Naam *
                </label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Voer speler naam in..."
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all transform hover:scale-105 text-sm sm:text-base"
                >
                  ✓ Toevoegen
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-bold shadow-lg transition-all text-sm sm:text-base"
                >
                  ✕ Annuleren
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Spelerslijst ({players.length} spelers)
            </h2>
          </div>

          {players.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-700 font-medium">
              Nog geen spelers toegevoegd. Klik op &quot;Nieuwe Speler&quot; om te beginnen.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Speler Naam
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16">
                      Actie
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm sm:text-base font-bold text-gray-900">
                            {player.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-200"
                          title="Speler verwijderen"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}