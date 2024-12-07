import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThirdwebProvider } from 'thirdweb/react'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <ThirdwebProvider>
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />
      </ThirdwebProvider>
    </>
  )
}
