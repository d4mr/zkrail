import 'dotenv/config';
import { PaymentCli } from './cli/paymentCli';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const cli = new PaymentCli();

async function promptUser() {
  rl.question('Enter payment command (or "exit" to quit): ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    try {
      await cli.processPaymentPrompt(input);
    } catch (error) {
      console.error('Failed to process payment:', error);
    }

    promptUser(); // Continue prompting
  });
}

console.log('Payment CLI started. Type your payment command (e.g., "transfer 100 rs to rahul@icicbank")');
promptUser(); 