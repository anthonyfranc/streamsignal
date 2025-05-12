import Link from "next/link"

import { MegaMenu } from "@/components/mega-menu"
import { Button } from "@/components/ui/button"

// Define the props interface
interface SiteHeaderProps {
  featuredServices?: any[]
  featuredChannels?: any[]
}

export function SiteHeader({ featuredServices = [], featuredChannels = [] }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">StreamSignal</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            <MegaMenu featuredServices={featuredServices} featuredChannels={featuredChannels} />
          </nav>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="hidden md:flex">
              Log in
            </Button>
            <Button size="sm">Sign up</Button>
          </div>
        </div>
      </div>
    </header>
  )
}
