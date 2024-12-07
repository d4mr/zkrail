import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from "sonner"
import { intentQueryOptions } from '@/queries/intent'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Skeleton } from './ui/skeleton'
import { useActiveAccount } from 'thirdweb/react'
import { keccak256, toBytes, toUnits, toWei, toTokens } from 'thirdweb'
import { baseSepolia } from 'thirdweb/chains';
import QRCode from "react-qr-code";
import { intentAggregatorApi } from '@/queries/conts'
import { solutionsQueryOptions } from '@/queries/solutions'

// EIP-712 Type Definitions
const DOMAIN = {
  name: 'ZKRail',
  version: '1',
  chainId: 84532,
  verifyingContract: '0x926B9bD1905CfeC995B0955DE7392bEdECE2FDC9', // ZKRailUPI contract address
} as const

const TYPES = {
  IntentSolution: [
    { name: 'intentId', type: 'bytes32' },
    { name: 'railType', type: 'string' },
    { name: 'recipientAddress', type: 'string' },
    { name: 'railAmount', type: 'uint256' },
    { name: 'paymentToken', type: 'address' },
    { name: 'paymentAmount', type: 'uint256' },
    { name: 'bondToken', type: 'address' },
    { name: 'bondAmount', type: 'uint256' },
    { name: 'intentCreator', type: 'address' }
  ]
} as const

function intentIdToBytes32(intentId: string): `0x${string}` {
  // If already hex
  if (intentId.startsWith('0x')) {
    return intentId as `0x${string}`
  }
  // If base58/UUID style, hash it
  return keccak256(toBytes(intentId)) as `0x${string}`
}

type IntentMutationArgs = {
  solverAddress: string,
  amountWei: bigint,
  signature: string
}

export function IntentDetails({ intentId }: { intentId: string }) {
  const [quoteAmount, setQuoteAmount] = useState('')
  const intentQuery = useQuery({ ...intentQueryOptions(intentId), refetchInterval: 5000 });
  const solutionsQuery = useQuery({ ...solutionsQueryOptions(intentId), refetchInterval: 5000 });

  const account = useActiveAccount();

  const mySolution = solutionsQuery.data?.find((solution) => solution.solverAddress === account?.address);
  const loading = intentQuery.isLoading;
  const intent = intentQuery.data;

  const submitIntentMutation = useMutation({
    mutationFn: async (args: IntentMutationArgs) => {
      await intentAggregatorApi.post(`intents/${intentId}/solutions`, {
        json: {
          solverAddress: args.solverAddress,
          amountWei: args.amountWei.toString(),
          signature: args.signature
        }
      })

      intentQuery.refetch();
      solutionsQuery.refetch();
    }
  })

  const handleSubmit = async () => {
    if (!account) {
      toast.error("Please connect your wallet to submit the solution");
      return;
    }

    if (!intent) {
      toast.error("Intent not found");
      return;
    }

    const solution = {
      intentId: intentIdToBytes32(intentId),
      railType: intent.railType,
      recipientAddress: intent.recipientAddress,
      railAmount: BigInt(intent.railAmount),
      paymentToken: intent.paymentToken,
      paymentAmount: toUnits(parseFloat(quoteAmount).toString(), 6),
      bondToken: intent.paymentToken,
      bondAmount: toUnits("500", 6),
      intentCreator: intent.creatorAddress
    };

    console.log(solution);

    // Sign the solution
    const signature = await account.signTypedData({
      types: TYPES,
      domain: DOMAIN,
      primaryType: 'IntentSolution',
      // @ts-ignore
      message: solution
    })

    console.log(signature);
    console.log(solution);
    console.log(intentIdToBytes32(intentId));

    await submitIntentMutation.mutateAsync({
      amountWei: toUnits(parseFloat(quoteAmount).toString(), 6),
      signature,
      solverAddress: account.address
    });

    toast.promise(
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Submitting solution...',
        success: 'Solution submitted successfully!',
        error: 'Failed to submit solution',
      }
    )
  }

  const paymentClaimMutation = useMutation({
    mutationFn: async () => {
      if (!mySolution?.id) throw new Error("Solution not found");

      await intentAggregatorApi.post(`solutions/${mySolution.id}/claim`, {
        json: {
          paymentMetadata: {
            "transactionId": "UPI/123/456",
            "timestamp": new Date().toISOString(),
            "railSpecificData": {}
          }
        }
      })

      toast.success("Payment claimed successfully");

      intentQuery.refetch();
      solutionsQuery.refetch();
    }
  })

  if (loading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-48 w-48 mx-auto" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!intent) {
    return <div className="text-center text-muted-foreground">Intent not found</div>
  }

  return (
    <div className="space-y-6 p-8">
      <h2 className="text-2xl font-bold">Intent Details
        <span className='pl-4 text-muted-foreground text-xs font-mono'>{intent.id} {intent.state}</span>
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Review the payment details and submit your solution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {intent.state === "SOLUTION_COMMITTED" && (
            <div className="flex justify-center">
              <div className="w-48 h-48 p-4 bg-white flex items-center justify-center text-black rounded-lg">
                <QRCode value={
                  `upi://pay?pa=${intent.recipientAddress}&am=${parseFloat(intent.railAmount) / 100}&cu=INR`
                } />
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <div className="font-mono text-xl">
                {intent.railType === "UPI" ? "₹" : ""}
                {(parseInt(intent.railAmount) / 100).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground">{intent.recipientAddress}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-amount">Your Quote ({intent.paymentToken})</Label>
              {(intent.state === "CREATED" && !mySolution) ? (
                <Input
                  id="quote-amount"
                  type="number"
                  placeholder={`Enter ${intent.paymentToken} amount`}
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                />
              ) : (
                <div className="font-mono text-xl p-2 bg-muted rounded-md">
                  {intent.winningSolution?.amountWei ?? (mySolution?.amountWei ? toTokens(BigInt(mySolution.amountWei), 6) : undefined)} {intent.paymentToken}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-accent/50">
            {/* https://cryptologos.cc/logos/polygon-matic-logo.svg?v=025 */}
            <img src="https://avatars.githubusercontent.com/u/108554348?v=4" alt="Base Sepolia Logo" width={20} height={20} />
            <span className="text-sm text-muted-foreground">Payment {
              intent.state === "SETTLED" || intent.state === "RESOLVED" ? "has been " : "will be "
            }
              received on Base Sepolia</span>
          </div>
          {intent.state === "CREATED" && (
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!quoteAmount || !!mySolution}
            >
              {
                mySolution ? "Solution Already Submitted" :
                  "Submit Solution"
              }
            </Button>
          )}
          {intent.state === "SOLUTION_COMMITTED" && (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-500">Your solution was accepted. 500 USDC has been locked as bond.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Transaction Hash: <span className="font-mono">{intent.winningSolution?.commitmentTxHash}</span>
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => paymentClaimMutation.mutate()}
              >
                {paymentClaimMutation.isPending && <Loader2 className="animate-spin" />}
                I have made the payment
              </Button>
            </div>
          )}
          {
            intent.state === "SETTLED" && (
              <div>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-500">Taker has settled the payment. Your bond has been refuned.</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Transaction Hash: <span className="font-mono">{intent.winningSolution?.settlementTxHash}</span>
                  </p>
                </div>
              </div>
            )
          }
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">
            If your solution is accepted, 500 USDC will be locked as bond to ensure you complete the payment. In case the payment is not received, the bond amount will be lost.
          </p>
          <p className="text-sm text-muted-foreground">
            Once the payment is made and the transaction is settled by the taker, the bond will be refunded to you.
          </p>
          <p className="text-sm text-muted-foreground">
            In case the UPI transaction is made by you, but the transaction is maliciously not settled by the taker, then you can generate a zkproof and submit it on chain, which will refund the bond, and also pay you the original USDC amount from the taker plus a 50% collateral as compensation for the inconvenience caused.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}