import { ethers } from 'ethers';

const PAYMENT_ROUTER = '0x34184b7bCB4E6519C392467402DB8a853EF57806';
const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const ABI = [
  'function sessionPaid(bytes32 sessionId) view returns (bool)',
  'event CheckoutPayment(bytes32 indexed sessionId, address indexed from, address indexed to, uint256 amount)',
];

function uuidToBytes32(uuid: string): string {
  const hex = uuid.replace(/-/g, '');
  return '0x' + hex.padEnd(64, '0');
}

// Direct on-chain read — the final truth
export async function verifyPaymentOnChain(sessionUUID: string): Promise<boolean> {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const contract = new ethers.Contract(PAYMENT_ROUTER, ABI, provider);
  return await contract.sessionPaid(uuidToBytes32(sessionUUID));
}

// PATH 2: Blockchain event listener — starts on server boot
// Catches payments independently of Locus webhooks
export function startPaymentEventListener(
  onPaymentDetected: (data: {
    sessionId: string;
    from: string;
    to: string;
    amount: string;
  }) => void
) {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const contract = new ethers.Contract(PAYMENT_ROUTER, ABI, provider);

  contract.on('CheckoutPayment', (sessionId: string, from: string, to: string, amount: bigint) => {
    console.log(`[EVENT] CheckoutPayment detected on-chain: ${sessionId}`);
    onPaymentDetected({
      sessionId,
      from,
      to,
      amount: ethers.formatUnits(amount, 6),
    });
  });

  console.log('[LISTENER] Watching for CheckoutPayment events on Payment Router...');
}
