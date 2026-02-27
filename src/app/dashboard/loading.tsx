export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen animate-pulse">
      <div className="pt-12 pb-4 px-6 flex items-center justify-between">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-8 h-8" />
      </div>
      <div className="px-6 space-y-4 mt-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}
