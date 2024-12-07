import { createFileRoute, Link, useParams } from '@tanstack/react-router'

import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TransactionTimeline } from '@/components/transaction-timeline'
import { intentQueryOptions } from '@/queries/intent'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ConnectButton, useActiveAccount } from 'thirdweb/react'
import { client } from '@/client'
import { intentIdToBytes32, zkRailUPI } from './$intent.quote'
import { getContract, prepareContractCall, sendAndConfirmTransaction } from 'thirdweb'
import { baseSepolia } from 'thirdweb/chains'
import { intentAggregatorApi } from '@/queries/conts'


export const Route = createFileRoute('/pay/$vpa/$name/$intent/wait')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { intent: intentId, name, vpa } = Route.useParams();
  const account = useActiveAccount();

  const intentQuery = useQuery({
    ...intentQueryOptions(intentId),
    refetchInterval: 4000,
  });

  const winningSolution = intentQuery.data?.winningSolution;

  const isUpiConfirmed = intentQuery.data?.state === "PAYMENT_CLAIMED" || intentQuery.data?.state === "SETTLED";

  const [showWarningDialog, setShowWarningDialog] = useState(false)

  const settleMutation = useMutation({
    mutationFn: async () => {
      if (!winningSolution) throw new Error("INVALID STATE");
      if (!account) throw new Error("Please connect wallet");

      const zkUpiContract = getContract({
        address: zkRailUPI,
        chain: baseSepolia,
        client
      });


      const transaction = prepareContractCall({
        contract: zkUpiContract,
        method: "function settle(bytes32)" as const,
        params: [intentIdToBytes32(intentId)]
      });

      const { transactionHash } = await sendAndConfirmTransaction({
        account,
        transaction,
      });

      console.log(transactionHash);

      await intentAggregatorApi.post(`solutions/${winningSolution.id}/settle`, {
        json: {
          settlementTxHash: transactionHash
        }
      });
      // return await client.post(`/intents/${intentId}/settle`).json()
    },
    onError: (err) => {
      console.error(err);
    }
  })



  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 pb-8">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-center mb-6">Payment Status</h2>
        <TransactionTimeline steps={[
          { label: 'Waiting for UPI Payment', status: isUpiConfirmed ? 'completed' : 'active' as const },
          {
            label: 'Settlement', status: isUpiConfirmed ? (
              intentQuery.data?.state === "SETTLED" ? "completed" :
                'active'
            ) : 'pending' as const
          },
          { label: 'All done', status: intentQuery.data?.state === "SETTLED" ? "completed" : 'pending' as const }
        ]} />
        {isUpiConfirmed &&
          <>
            {
              intentQuery.data?.state !== "SETTLED" ?
                <>
                  <p className="text-center mt-6">Confirm you have received the payment to settle the transaction and receive your 50% collateral.</p>
                  <Button
                    className="w-full"
                    onClick={() => settleMutation.mutate()}
                  >
                    {settleMutation.isPending && <Loader2 className='animate-spin' />}
                    Settle Payment
                  </Button>
                  <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="w-full">
                        Didn&apos;t Receive Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Warning</DialogTitle>
                        <DialogDescription>
                          If you have not received the payment, you will receive your original amount + the bond amount (500 USDC) after 48 hours.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <p className="text-sm">
                          If you maliciously do not confirm the payment despite the taker having made the payment, the maker can submit a zkproof of this transaction. If the zkproof is verified on-chain, you will lose the bond amount. It's better to settle the payment once received.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <ConnectButton client={client} />
                </> : <Link
                  className={buttonVariants({
                    variant: 'outline',
                    className: "w-full"
                  })}
                  to="/"
                >
                  Done
                </Link>
            }
          </>}
      </div>
    </div>
  )
}

