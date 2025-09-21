import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-lg border-b-2 border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 sm:py-6 min-h-[80px]">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Image
                src="/Logo.jpg"
                alt="Wisselapp Logo"
                width={32}
                height={32}
                className="object-contain"
              />
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900">Wisselapp</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Welkom bij de Wisselapp
          </h2>
          <p className="text-gray-600 mb-6">
            Deze app helpt je bij het beheren van je wisselbeleid voor 6v6 voetbalwedstrijden.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start Wedstrijd
              </h3>
              <p className="text-gray-600 mb-4">
                Start een nieuwe wedstrijd. Aantal spelers bepaalt de wisselstrategie.
              </p>
              <Link href="/game/new" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block">
                Wedstrijd Starten
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Spelers Beheren
              </h3>
              <p className="text-gray-600 mb-4">
                Voeg spelers toe en beheer je spelerslijst.
              </p>
              <Link href="/players" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors inline-block">
                Spelers Beheren
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
