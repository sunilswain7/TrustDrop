import { startPaymentEventListener } from './verification';
import { handlePaymentConfirmed } from './release';

export function initBlockchainListener() {
  startPaymentEventListener(async (data) => {
    console.log(`[EVENT] CheckoutPayment caught from blockchain`);
    console.log(`[EVENT] Session: ${data.sessionId}, From: ${data.from}, Amount: $${data.amount}`);

    await handlePaymentConfirmed(data.sessionId, 'event_listener', {
      payerAddress: data.from,
    });
  });
}
