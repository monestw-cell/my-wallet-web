import { base44 } from "@/api/base44Client";

export async function getWallet() {
  const list = await base44.entities.Wallet.list("created_date", 1);
  if (list.length > 0) return list[0];
  return await base44.entities.Wallet.create({ balance: 0 });
}

export async function updateWalletBalance(delta) {
  const wallet = await getWallet();
  const newBalance = Math.max(0, (wallet.balance || 0) + delta);
  await base44.entities.Wallet.update(wallet.id, { balance: newBalance });
  return newBalance;
}