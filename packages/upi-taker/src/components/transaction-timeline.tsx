import { Check, Loader2 } from 'lucide-react'

interface Step {
  label: string
  status: 'pending' | 'active' | 'completed'
}

interface TransactionTimelineProps {
  steps: Step[]
}

export function TransactionTimeline({ steps }: TransactionTimelineProps) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            step.status === 'completed' ? 'bg-green-500' :
            step.status === 'active' ? 'bg-primary' : 'bg-muted'
          }`}>
            {step.status === 'completed' ? (
              <Check className="w-4 h-4 text-primary-foreground" />
            ) : step.status === 'active' ? (
              <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
            ) : null}
          </div>
          <span className={`${
            step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
          }`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}

