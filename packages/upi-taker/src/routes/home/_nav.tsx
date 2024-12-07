import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Home, ClipboardList } from 'lucide-react'
import { cn } from "@/lib/utils"

export const Route = createFileRoute('/home/_nav')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <Outlet />
      <BottomNav />
    </div>
  )
}


interface BottomNavProps {
  activeTab: 'payments' | 'orders'
  onTabChange: (tab: 'payments' | 'orders') => void
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around">
        <Link to="/home/scan"
          className='flex flex-col items-center w-full py-2 '
          activeProps={{
            className: "text-primary"
          }}
          inactiveProps={{
            className: "text-muted-foreground"
          }}
        >
          <Home className="h-6 w-6 mb-1" />
          <span className="text-xs">Payments</span>
        </Link>

        <Link to="/home/orders"
          className='flex flex-col items-center w-full py-2 '
          activeProps={{
            className: "text-primary"
          }}
          inactiveProps={{
            className: "text-muted-foreground"
          }}
        >
          <ClipboardList className="h-6 w-6 mb-1" />
          <span className="text-xs">Orders</span>
        </Link>
      </div>
    </nav>
  )
}


