import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button, buttonVariants } from "@/components/ui/button"
import { Loader2, HelpCircle, ArrowLeftRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"


export const Route = createFileRoute('/pay/$vpa/$name/$amount/quote')({
  component: RouteComponent,
})

function RouteComponent() {
  const { vpa, name, amount: stringAmount } = Route.useParams();
  const amount = parseFloat(stringAmount);

  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)
  const [refreshing, setRefreshing] = useState(false)


  const [quote, setQuote] = useState<{
    address: string
    usdcAmount: number
    collateral: number
    bondAmount: number
  } | null>(null)

  useEffect(() => {
    // Initial quote fetch
    const timer = setTimeout(() => {
      setQuote({
        address: '0x1234...5678',
        usdcAmount: amount / 80, // Assuming 1 USD = 80 INR
        collateral: (amount / 80) * 0.5, // 50% collateral
        bondAmount: (amount / 80) * 0.1 // 10% bond amount (example)
      })
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [amount])

  useEffect(() => {
    if (!loading) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setRefreshing(true)
            setTimeout(() => {
              setRefreshing(false)
              // Simulate quote refresh
              setQuote(prev => {
                if (!prev) return null
                const newUsdcAmount = prev.usdcAmount * (0.995 + Math.random() * 0.01)
                return {
                  ...prev,
                  usdcAmount: newUsdcAmount,
                  collateral: newUsdcAmount * 0.5 // Refresh collateral amount
                }
              })
            }, 1000)
            return 5
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [loading])

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
              <span>REFRESHING BEST QUOTE IN {countdown}</span>
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
              <p className="font-mono">{quote?.address}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quote amount</span>
                <span className="font-mono">{quote?.usdcAmount.toFixed(2)} USDC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Refundable collateral</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">A 50% collateral is required. This amount will be fully refunded after the transaction is confirmed.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center">
                  <span className="font-mono">{quote?.collateral.toFixed(2)} USDC</span>
                  <ArrowLeftRight className="h-4 w-4 ml-2 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="text-muted-foreground mr-2">Bond amount</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Bond amount is promised by the maker. If the maker fails to make a payment within 48 hours, the bond + the payment amount is refunded to you.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="font-mono">{quote?.bondAmount.toFixed(2)} USDC</span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total to pay now</span>
                  <span className="font-mono text-2xl font-bold">
                    {((quote?.usdcAmount || 0) + (quote?.collateral || 0)).toFixed(2)} USDC
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  <span>{quote?.collateral.toFixed(2)} USDC will be refunded after confirmation</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <Button
          className="w-full btn-glossy"
        // onClick={onConfirm}
        >
          Confirm Payment
        </Button>
        <Link
          className={buttonVariants({
            className: "w-full btn-glossy",
            variant: "secondary"
          })}
          to="/"
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
