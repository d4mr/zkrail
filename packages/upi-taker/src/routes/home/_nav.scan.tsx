import { Button } from '@/components/ui/button';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Scan } from 'lucide-react';
import { useState } from 'react';
import { useZxing } from "react-zxing";
import { useMediaDevices } from "react-media-devices";
import { client } from '@/client';
import { ConnectButton } from 'thirdweb/react';

const constraints: MediaStreamConstraints = {
  video: true,
  audio: false,
};


export const Route = createFileRoute('/home/_nav/scan')({
  component: RouteComponent,
})

function RouteComponent() {
  const [result, setResult] = useState("");
  const { devices } = useMediaDevices({ constraints });
  const navigate = useNavigate();
  const deviceId = devices?.[0]?.deviceId;

  const { ref } = useZxing({
    paused: !deviceId,
    onDecodeResult(result) {
      const scannedAddress = result.getText();
      console.log(scannedAddress);
      if (!scannedAddress.includes("upi://pay?")) return;
      // format upi://pay?pa=address&pn=name
      // get values by regex
      const parts = scannedAddress.match(/pa=(.*)&pn=(.*)/)?.slice(1);
      const vpa = parts?.[0];
      const name = parts?.[1];

      if (!vpa || !name) return;

      navigate({
        to: "/pay/$vpa/$name",
        params: {
          name, vpa
        }
      })

    },
  });

  return <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
    <header className="p-4 text-center gap-4 flex flex-col">
      <h1 className="text-lg font-semibold gap-2">
        <div className='font-mono text-xs'>zkrail</div>
        <div className='italic text-xl'>UPI</div>
      </h1>
      <div>
        <ConnectButton client={client} />
      </div>
    </header>
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="aspect-square bg-card rounded-lg flex items-center justify-center overflow-hidden relative">
          <div className='absolute inset-0 grid place-items-center z-50'>
            <Scan className="w-24 h-24 text-muted-foreground" />
          </div>
          <video ref={ref} className='w-full h-full object-cover' />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">Scan UPI QR Code</p>
          <p className="text-sm text-muted-foreground">Scan QR code to get best rates</p>
        </div>
        <div className="flex justify-center">
          <div className="border-foreground/10 border rounded-full py-2 px-4 flex items-center space-x-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Circle_USDC_Logo.svg/1024px-Circle_USDC_Logo.svg.png?20220815163658"
              alt="USDC Logo"
              width={24}
              height={24}
            />
            <span className="text-sm font-medium">Paying in USDC</span>
          </div>
        </div>
      </div>
    </main>
  </div>
}
