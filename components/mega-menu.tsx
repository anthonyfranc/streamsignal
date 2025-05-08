"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import type { ChannelWithDetails } from "@/app/actions/channel-actions"
import type { ServiceWithDetails } from "@/app/actions/service-actions"

interface MegaMenuProps {
  featuredServices: ServiceWithDetails[]
  featuredChannels: ChannelWithDetails[]
}

export function MegaMenu({ featuredServices = [], featuredChannels = [] }: MegaMenuProps) {
  const pathname = usePathname()
  const isMobile = useMobile()

  // Fallback data in case the arrays are empty
  const defaultServices = [
    { id: 1, name: "Netflix", logo_url: "/placeholder.svg", monthly_price: 15.99, channel_count: 0 },
    { id: 2, name: "Hulu", logo_url: "/placeholder.svg", monthly_price: 7.99, channel_count: 0 },
    { id: 3, name: "Disney+", logo_url: "/placeholder.svg", monthly_price: 9.99, channel_count: 0 },
  ]

  const defaultChannels = [
    { id: 1, name: "ESPN", logo_url: "/placeholder.svg", category: "Sports", service_count: 5 },
    { id: 2, name: "HBO", logo_url: "/placeholder.svg", category: "Entertainment", service_count: 3 },
    { id: 3, name: "CNN", logo_url: "/placeholder.svg", category: "News", service_count: 7 },
  ]

  // Use the fetched data or fallback to defaults if empty
  const services = featuredServices.length > 0 ? featuredServices : defaultServices
  const channels = featuredChannels.length > 0 ? featuredChannels : defaultChannels

  const routes = [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Services",
      href: "/services",
      content: (
        <div className="grid gap-6 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Streaming Services</h3>
            <p className="text-sm text-muted-foreground">
              Compare and find the best streaming services for your entertainment needs.
            </p>
            <div className="pt-2">
              <Link href="/services" passHref>
                <Button variant="outline" className="w-full justify-start">
                  View All Services
                </Button>
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Featured Services</h4>
            <div className="grid gap-3">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-accent"
                >
                  {service.logo_url ? (
                    <img
                      src={service.logo_url || "/placeholder.svg"}
                      alt={service.name}
                      className="h-8 w-8 rounded-md object-contain"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      {service.name.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${service.monthly_price}/mo · {service.channel_count} channels
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Channels",
      href: "/channels",
      content: (
        <div className="grid gap-6 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">TV Channels</h3>
            <p className="text-sm text-muted-foreground">
              Find which streaming services offer your favorite TV channels.
            </p>
            <div className="pt-2">
              <Link href="/channels" passHref>
                <Button variant="outline" className="w-full justify-start">
                  View All Channels
                </Button>
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Featured Channels</h4>
            <div className="grid gap-3">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.id}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-accent"
                >
                  {channel.logo_url ? (
                    <img
                      src={channel.logo_url || "/placeholder.svg"}
                      alt={channel.name}
                      className="h-8 w-8 rounded-md object-contain"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      {channel.name.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.category} · {channel.service_count} services
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Tools",
      href: "#",
      content: (
        <div className="grid gap-6 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Streaming Tools</h3>
            <p className="text-sm text-muted-foreground">
              Interactive tools to help you make the best streaming decisions.
            </p>
          </div>
          <div className="grid gap-6">
            <Link
              href="/recommendations"
              className="group grid h-full w-full items-start gap-1 rounded-md p-3 hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-thumbs-up"
                  >
                    <path d="M7 10v12" />
                    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium">Service Recommendations</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Get personalized streaming service recommendations based on your preferences.
              </p>
            </Link>
            <Link href="/compare" className="group grid h-full w-full items-start gap-1 rounded-md p-3 hover:bg-accent">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-bar-chart-2"
                  >
                    <line x1="18" x2="18" y1="20" y2="10" />
                    <line x1="12" x2="12" y1="20" y2="4" />
                    <line x1="6" x2="6" y1="20" y2="14" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium">Comparison Tool</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Compare streaming services side-by-side to find the best option.
              </p>
            </Link>
          </div>
        </div>
      ),
    },
    {
      title: "About",
      href: "/about",
    },
  ]

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 text-lg font-semibold",
                pathname === "/" ? "text-primary" : "text-foreground/60",
              )}
            >
              Home
            </Link>
            {routes.slice(1).map((route, i) => (
              <div key={i} className="grid gap-3">
                <Link
                  href={route.href}
                  className={cn(
                    "flex items-center gap-2",
                    pathname === route.href ? "text-primary" : "text-foreground/60",
                  )}
                >
                  {route.title}
                </Link>
                {route.content && (
                  <div className="grid gap-2 pl-4">
                    {route.title === "Services" && (
                      <>
                        <div className="grid gap-2">
                          <h4 className="text-sm font-medium">Featured Services</h4>
                          {services.map((service) => (
                            <Link
                              key={service.id}
                              href={`/services/${service.id}`}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              {service.name}
                            </Link>
                          ))}
                          <Link href="/services" className="text-sm font-medium text-primary hover:underline">
                            View All Services
                          </Link>
                        </div>
                      </>
                    )}
                    {route.title === "Channels" && (
                      <>
                        <div className="grid gap-2">
                          <h4 className="text-sm font-medium">Featured Channels</h4>
                          {channels.map((channel) => (
                            <Link
                              key={channel.id}
                              href={`/channels/${channel.id}`}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              {channel.name}
                            </Link>
                          ))}
                          <Link href="/channels" className="text-sm font-medium text-primary hover:underline">
                            View All Channels
                          </Link>
                        </div>
                      </>
                    )}
                    {route.title === "Tools" && (
                      <>
                        <Link href="/recommendations" className="flex items-center gap-2 text-sm text-muted-foreground">
                          Service Recommendations
                        </Link>
                        <Link href="/compare" className="flex items-center gap-2 text-sm text-muted-foreground">
                          Comparison Tool
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <Link href="/" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>Home</NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        {routes.slice(1).map((route, i) =>
          route.content ? (
            <NavigationMenuItem key={i}>
              <NavigationMenuTrigger>{route.title}</NavigationMenuTrigger>
              <NavigationMenuContent>{route.content}</NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={i}>
              <Link href={route.href} legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>{route.title}</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
