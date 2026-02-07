
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col min-h-[100dvh]">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/login">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">MAVERIX HRM SOLUTIONS</h1>
        </Link>
      </header>
    </div>
  );
}
