import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Loader2, HelpCircle, ArrowLeftRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import { useMutation, useQuery } from '@tanstack/react-query'
import { solutionsQueryOptions } from '@/queries/solutions'
import { intentQueryOptions } from '@/queries/intent'
import { getContract, Hex, keccak256, prepareContractCall, readContract, sendAndConfirmTransaction, sendTransaction, stringToHex, toBytes, toTokens, toUnits } from 'thirdweb'
import { shortenAddress } from 'thirdweb/utils'
import { ConnectButton, useActiveAccount } from 'thirdweb/react'
import { client } from '@/client'
import { baseSepolia } from 'thirdweb/chains'
import { zkRailUsdc } from '.'
import { intentAggregatorApi } from '@/queries/conts'

export const zkRailUPI = "0x926B9bD1905CfeC995B0955DE7392bEdECE2FDC9";

export const Route = createFileRoute('/pay/$vpa/$name/$intent/quote')({
  component: RouteComponent,
})

// Helper for converting intent ID to bytes32

export function intentIdToBytes32(intentId: string): `0x${string}` {
  // If already hex
  if (intentId.startsWith('0x')) {
    return intentId as `0x${string}`
  }
  // If base58/UUID style, hash it
  return keccak256(toBytes(intentId)) as `0x${string}`
}

function RouteComponent() {
  const { vpa, name, intent: intentId } = Route.useParams();
  const account = useActiveAccount();

  const intentSolutionsQuery = useQuery({ ...solutionsQueryOptions(intentId), refetchInterval: 2000 });
  const intentQuery = useQuery(intentQueryOptions(intentId));

  const navigate = useNavigate();

  const lowestQuote = intentSolutionsQuery.data?.[0];
  const lowestQuoteAmount = intentSolutionsQuery.data?.[0]?.amountWei ? BigInt(intentSolutionsQuery.data?.[0].amountWei) : undefined;
  const lowestQuoteCollateral = intentSolutionsQuery.data?.[0]?.amountWei ? BigInt(intentSolutionsQuery.data?.[0].amountWei) / 2n : undefined;
  const lowestQuoteTotal = lowestQuoteAmount && lowestQuoteCollateral ? lowestQuoteAmount + lowestQuoteCollateral : undefined;

  const loading = intentSolutionsQuery.isLoading || !lowestQuote;
  const refreshing = intentQuery.isFetching;

  const commitSolutionMutation = useMutation({
    mutationFn: async () => {
      if (!lowestQuoteAmount || !lowestQuote || !intentQuery.data || !account) {
        console.error("error");
        throw new Error("no data")
      };
      const intent = intentQuery.data;

      const zkUpiContract = getContract({
        address: zkRailUPI,
        chain: baseSepolia,
        client
      });

      // const totalAmount = await readContract({
      //   contract: zkUpiContract,
      //   method: 'function calculateTotalAmount(uint256 paymentAmount) external view returns (uint256)',
      //   params: [lowestQuoteAmount]
      // })

      const formattedSolution = [
        intentIdToBytes32(lowestQuote.intentId),
        intent.railType as string,
        intent.recipientAddress as string,
        BigInt(intent.railAmount),
        intent.paymentToken,
        lowestQuoteAmount,
        zkRailUsdc,
        toUnits("500", 6),
        account.address
      ] as const;

      const transaction = prepareContractCall({
        contract: zkUpiContract,
        method: "function commitToSolution((bytes32,string,string,uint256,address,uint256,address,uint256,address),bytes)" as const,
        params: [formattedSolution, lowestQuote.signature as Hex],
      });

      const { transactionHash } = await sendAndConfirmTransaction({
        account,
        transaction,
      });

      console.log(transactionHash);
      await intentAggregatorApi.post(`solutions/${lowestQuote.id}/accept`, {
        json: {
          commitmentTxHash: transactionHash
        }
      });

      navigate({
        to: "/pay/$vpa/$name/$intent/wait",
        params: {
          intent: intentId,
          name, vpa
        }
      })

    },
    onError: (error) => {
      console.error(error)
    }
  });


  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p className="text-xl">Fetching best rates...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 pb-8">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Quote</h2>
          <div className="font-mono text-sm text-muted-foreground">
            {refreshing ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                REFRESHED
              </span>
            ) : (
              <span>REFRESHING BEST QUOTE IN 2 SECONDS</span>
            )}
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/8/8c/Polygon_Blockchain_Matic_Logo.svg"
                alt="Polygon Logo"
                width={20}
                height={20}
                className="opacity-70"
              />
              <p className="font-mono">{shortenAddress(lowestQuote?.solverAddress)}</p>
            </div>

            <div className="space-y-4">

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quote amount</span>
                <span className="font-mono">
                  {toTokens(BigInt(lowestQuote.amountWei), 6)} USDC
                </span>
              </div>


              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">
                    Refundable collateral
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          A 50% collateral is required. This amount will be
                          fully refunded after the transaction is confirmed.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center">
                  <span className="font-mono">
                    {lowestQuoteCollateral ? toTokens(lowestQuoteCollateral, 6) : "..."} USDC
                  </span>
                  <ArrowLeftRight className="h-4 w-4 ml-2 text-green-500" />
                </div>
              </div>


              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">
                    Bond amount
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Bond amount is promised by the maker. If the maker
                          fails to make a payment within 48 hours, the bond +
                          the payment amount is refunded to you.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="font-mono">
                  500 USDC
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Receiving At</span>
                <span className="font-mono text-muted-foreground">
                  {vpa}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Receiving Amount</span>
                <span className="font-mono text-muted-foreground">
                  {intentQuery.data?.railAmount ? toTokens(BigInt(intentQuery.data?.railAmount), 2) : "..."} INR
                </span>
              </div>


              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Total to pay now
                  </span>
                  <span className="font-mono text-2xl font-bold">
                    {lowestQuoteTotal ? toTokens(lowestQuoteTotal, 6) : "..."}
                    USDC
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <span>
                    {lowestQuoteCollateral ? toTokens(lowestQuoteCollateral, 6) : "..."} USDC will be refunded after
                    confirmation
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <ConnectButton client={client} />

        <Button
          className="w-full btn-glossy"
          onClick={() => commitSolutionMutation.mutate()}
        >
          {commitSolutionMutation.isPending && <Loader2 className="animate-spin" />}
          Confirm Payment
        </Button>
        <Link
          className={buttonVariants({
            className: 'w-full btn-glossy',
            variant: 'secondary',
          })}
          to="/"
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
