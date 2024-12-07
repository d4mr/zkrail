import { intentsQueryOptions } from "@/queries/intents";
import { ScrollArea } from "./ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Loader2 } from 'lucide-react'
import { Skeleton } from "./ui/skeleton";
import { d1DateStringToLocaleString } from "@/queries/utils";

export function IntentsList({
  onSelectIntent,
}: {
  onSelectIntent: (intentId: string) => void;
}) {
  const intentsQuery = useQuery({ ...intentsQueryOptions, refetchInterval: 5000 });
  const intents = intentsQuery.data ?? [];

  const skeletonsArray = Array.from({ length: 20 }).fill(null);

  return (
    <ScrollArea className="h-full max-w-lg flex-grow border border-border/50 bg-background/50 relative">
      <h2 className="text-xl font-semibold mb-6 sticky top-0 p-6 bg-background/90">Intents</h2>
      <div className="px-6 pb-8">
        <div className="space-y-3">
          {
            intentsQuery.isLoading && skeletonsArray.map((_, index) => (
              <Skeleton className="w-full p-10" />
            ))
          }
          {intents.map((intent) => (
            <button
              key={intent.id}
              className="w-full p-4 rounded-lg border border-border/50 hover:bg-accent hover:border-border transition-colors text-left flex justify-between items-center"
              onClick={() => onSelectIntent(intent.id)}
            >
              <div className="space-y-1.5">
                <div className="font-mono text-lg">₹{((Number.parseFloat(intent.railAmount)) / 100).toLocaleString('en-IN')}</div>
                <div className="text-sm text-muted-foreground">{intent.recipientAddress}</div>
                <div className="text-xs text-muted-foreground/60">{d1DateStringToLocaleString(intent.createdAt)}</div>
              </div>
              {/* {intent.state === '' && (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              )} */}
              {intent.state === 'SETTLED' || intent.state === 'RESOLVED' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
