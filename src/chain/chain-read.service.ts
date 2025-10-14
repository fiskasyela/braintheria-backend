import { Injectable } from '@nestjs/common';
import { createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';
import { QNA_ABI } from './qna.abi';

@Injectable()
export class ChainReadService {
  private client = createPublicClient({
    chain: base, // built-in Base chain preset
    transport: http(process.env.RPC_URL!),
  });

  private contract = {
    address: process.env.CONTRACT_ADDRESS as Address,
    abi: QNA_ABI,
  } as const;

  async bountyOf(qId: number): Promise<bigint> {
    try {
      const result = await this.client.readContract({
        ...this.contract,
        functionName: 'bountyOf',
        args: [BigInt(qId)],
      });
      return result as bigint;
    } catch (error) {
      console.error('Error reading bounty:', error);
      return 0n;
    }
  }
}
