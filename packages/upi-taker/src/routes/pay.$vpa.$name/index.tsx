import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Button, buttonVariants } from "@/components/ui/button"
import { useMutation } from '@tanstack/react-query'
import { intentAggregatorApi } from '@/queries/conts'
import { ConnectButton, useActiveAccount } from 'thirdweb/react'
import { Loader2 } from 'lucide-react'
import { client } from '@/client'

export const zkRailUsdc = "0x215D8DC520791a5fECa4D302798D8C47aD7E0588";
const chainId = 84532;

interface PaymentScreenProps {
  recipient: string
  onCancel: () => void
  onPay: (amount: number) => void
}
export const Route = createFileRoute('/pay/$vpa/$name/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [amount, setAmount] = useState('')
  const { name, vpa } = Route.useParams();
  const navigate = useNavigate();
  const account = useActiveAccount();

  const handleNumberInput = useCallback((num: string) => {
    if (amount.includes('.') && num === '.') return
    if (amount === '0' && num !== '.') {
      setAmount(num)
    } else {
      setAmount(prev => prev + num)
    }
  }, [amount])

  const handleDelete = useCallback(() => {
    setAmount(prev => prev.slice(0, -1))
  }, []);

  const submitIntentMutation = useMutation({
    mutationFn: async (amount: string) => {
      if (!account) throw new Error("Wallet not connected");

      return await intentAggregatorApi.post<{ intentId: string }>(`intents`, {
        json: {
          paymentToken: zkRailUsdc,
          railType: "UPI",
          recipientAddress: vpa,
          railAmount: amount,
          creatorAddress: account.address,
          chainId
        }
      }).json()
    }
  });


  const handlePay = async () => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      const intent = await submitIntentMutation.mutateAsync((numAmount * 100).toString());
      console.log(intent);

      navigate({
        to: "/pay/$vpa/$name/$intent/quote",
        params: {
          name, vpa, intent: intent.intentId
        }
      })
    }
  }

  const handleKeyboardInput = useCallback((event: KeyboardEvent) => {
    const key = event.key
    if (/^[0-9.]$/.test(key)) {
      handleNumberInput(key)
    } else if (key === 'Backspace') {
      handleDelete()
    } else if (key === 'Enter') {
      handlePay()
    }
  }, [handleNumberInput, handleDelete, handlePay])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardInput)
    return () => {
      window.removeEventListener('keydown', handleKeyboardInput)
    }
  }, [handleKeyboardInput])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4 pb-8">
      <div className="flex-1 flex flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Paying</h2>
          <p className="text-muted-foreground">{name}</p>
          <div className="mt-2 flex items-center space-x-2">
            <span>With</span>
            <div className="bg-secondary rounded-full py-1 px-3 flex items-center space-x-2">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Circle_USDC_Logo.svg/1024px-Circle_USDC_Logo.svg.png?20220815163658"
                alt="USDC Logo"
                width={20}
                height={20}
              />
              <span className="text-sm font-medium">USDC</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Enter Amount</h2>
          <div className="bg-secondary rounded-lg p-4 text-right text-3xl font-bold flex justify-end items-center shadow-inner">
            <span className="text-muted-foreground mr-2 text-2xl">INR</span>
            {amount || '0'}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-4 max-w-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'del'].map((key) => (
              <Button
                key={key}
                className="btn-glossy bg-secondary hover:bg-secondary/80 text-foreground text-2xl py-4 w-20 h-20"
                onClick={() => key === 'del' ? handleDelete() : handleNumberInput(key.toString())}
              >
                {key === 'del' ? '⌫' : key}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <ConnectButton client={client} />

        <Button
          className="w-full btn-glossy"
          onClick={handlePay}
        >
          {
            submitIntentMutation.isPending &&
            <Loader2 className='animate-spin' />
          }
          Pay
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

