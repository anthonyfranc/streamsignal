import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-gray-100 bg-white py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold">StreamSignal</span>
          </Link>
          <nav className="flex gap-4 md:gap-6">
            <Link href="#" className="text-xs md:text-sm">
              Terms
            </Link>
            <Link href="#" className="text-xs md:text-sm">
              Privacy
            </Link>
            <Link href="#" className="text-xs md:text-sm">
              Contact
            </Link>
          </nav>
        </div>
        <p className="text-xs text-gray-700">© {new Date().getFullYear()} StreamSignal. All rights reserved.</p>
      </div>
    </footer>
  )
}
