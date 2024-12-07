import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IntentsList } from '@/components/intents-list'
import { IntentDetails } from '@/components/intent-details';

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const [intentId, setIntentId] = React.useState<string | null>(null);

  return (
    <div className='grid grid-cols-[1fr_3fr] h-full'>
      <IntentsList onSelectIntent={setIntentId} />
      {
        intentId &&
        <IntentDetails intentId={intentId} />
      }
    </div>
  )
}
