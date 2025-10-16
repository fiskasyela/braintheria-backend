import { Injectable } from '@nestjs/common';
import { QNA_ABI } from './qna.abi';
import { Address, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class SignerService {
  private readonly account = privateKeyToAccount(
    process.env.SERVER_SIGNER_PRIVATE_KEY as `0x${string}`,
  );

  private readonly wallet = createWalletClient({
    account: this.account,
    chain: base,
    transport: http(process.env.RPC_URL!),
  });

  private readonly contract = {
    address: process.env.CONTRACT_ADDRESS as Address,
    abi: QNA_ABI,
  } as const;

  constructor() {}

  async fundBounty(qId: number, amountWei: bigint) {
    const txHash = await this.wallet.writeContract({
      ...this.contract,
      functionName: 'fundBounty',
      args: [BigInt(qId)],
      value: amountWei,
    });
    return txHash;
  }
}
