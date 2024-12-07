import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/home/_nav/orders')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/home/orders"!</div>
}
