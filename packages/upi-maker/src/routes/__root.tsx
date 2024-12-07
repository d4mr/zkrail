import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ConnectButton, ThirdwebProvider } from 'thirdweb/react'
import { client } from '@/client'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <ThirdwebProvider>
        <div className='h-full flex flex-col overflow-hidden max-h-full'>
          <header className="p-4 text-center gap-4 flex items-center">
            <h1 className="text-lg font-semibold gap-4 flex items-center">
              <div className='font-mono'>zkrail</div>
              <div className='text-muted-foreground'>UPI Intent Solver</div>
            </h1>
            <div className='ml-auto'>
              <ConnectButton client={client} />
            </div>
          </header>
          <hr />
          <Outlet />
        </div>
        <TanStackRouterDevtools position="bottom-right" />
      </ThirdwebProvider>
    </>
  )
}
