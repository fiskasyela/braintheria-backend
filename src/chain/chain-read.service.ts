import { Injectable, OnModuleInit } from '@nestjs/common';
import { createPublicClient, http, Address } from 'viem';
import { base } from 'viem/chains';
import { ethers } from 'ethers';
import { QNA_ABI } from './qna.abi';


@Injectable()
export class ChainReadService implements OnModuleInit {
  private client; // viem client (for readContract)
  private provider: ethers.JsonRpcProvider;
  private contract: { address: Address; abi: typeof QNA_ABI };

  constructor() {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) throw new Error('RPC_URL is missing in .env');

    // 1️⃣ viem client (faster for readContract)
    this.client = createPublicClient({
      chain: base, // use Base Sepolia preset (or Base Mainnet if you change RPC)
      transport: http(rpcUrl),
    });

    // 2️⃣ ethers provider (for getBalance, etc.)
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // 3️⃣ contract info
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) throw new Error('CONTRACT_ADDRESS missing in .env');

    this.contract = {
      address: contractAddress as Address,
      abi: QNA_ABI,
    } as const;
  }

  // ✅ Runs once on boot
  async onModuleInit() {
    const network = await this.provider.getNetwork();
    console.log(
      `[ChainReadService] Connected to network: ${network.name} (chainId=${network.chainId})`,
    );
  }

  /**
   * 🔹 Get user's ETH balance (as string, in ETH)
   */
  async getEthBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`[ChainReadService] Failed to fetch ETH balance:`, error);
      return '0';
    }
  }

  /**
   * 🔹 Get bounty value for a given question ID from the contract
   */
  async bountyOf(qId: number): Promise<bigint> {
    try {
      const bounty = await this.client.readContract({
        ...this.contract,
        functionName: 'bountyOf',
        args: [BigInt(qId)],
      });
      return bounty as bigint;
    } catch (error) {
      console.error(
        `[ChainReadService] Failed to read bountyOf(${qId}):`,
        error,
      );
      return 0n;
    }
  }

  /**
   * 🔹 Get total number of questions (optional helper)
   */
  async getQuestionCount(): Promise<number> {
    try {
      const count = await this.client.readContract({
        ...this.contract,
        functionName: 'questionCount', // adjust if your contract uses another name
      });
      return Number(count);
    } catch (error) {
      console.error(`[ChainReadService] Failed to read questionCount:`, error);
      return 0;
    }
  }

  /**
   * 🔹 Get contract’s ETH balance (to monitor bounty pool)
   */
  async getContractBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.contract.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(
        `[ChainReadService] Failed to fetch contract balance:`,
        error,
      );
      return '0';
    }
  }
}
