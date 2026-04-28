export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initBlockchainListener } = await import('./lib/start-listener');
    initBlockchainListener();
  }
}
