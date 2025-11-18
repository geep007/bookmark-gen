export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Unified Bookmark Intelligence System
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Transform scattered social media bookmarks into actionable insights
          </p>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 w-full max-w-4xl">
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="text-4xl mb-2">💡</div>
            <h2 className="text-xl font-semibold mb-2">Inspo</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Creative references and aesthetic signals for inspiration
            </p>
          </div>

          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="text-4xl mb-2">🎯</div>
            <h2 className="text-xl font-semibold mb-2">Leads/Markets</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Potential clients, industries, and opportunities
            </p>
          </div>

          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="text-4xl mb-2">📚</div>
            <h2 className="text-xl font-semibold mb-2">Tutorials</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Learning resources and skill-building content
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🚧 MVP in development - Dashboard coming soon</p>
        </div>
      </main>
    </div>
  );
}
