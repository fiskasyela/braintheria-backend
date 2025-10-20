// signer.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';
import { QNA_ABI } from './qna.abi';

@Injectable()
export class SignerService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    // Connect to blockchain node
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.SERVER_SIGNER_PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl) throw new Error('RPC_URL missing in .env');
    if (!privateKey)
      throw new Error('SERVER_SIGNER_PRIVATE_KEY missing in .env');
    if (!contractAddress) throw new Error('CONTRACT_ADDRESS missing in .env');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, QNA_ABI, this.signer);
  }

  // Optional debugging connection info
  async testConnection() {
    const network = await this.provider.getNetwork();
    console.log(`[SignerService] Connected to chain: ${network.chainId}`);
    console.log(
      `[SignerService] Using address: ${await this.signer.getAddress()}`,
    );
  }

  getContract() {
    return this.contract;
  }

  /**
   * Ask a new question on-chain with optional ETH bounty.
   */
  async askQuestion(
    tokenAddress: string,
    bountyWei: bigint,
    deadline: number,
    uri: string,
  ) {
    try {
      console.log('🟢 Sending askQuestion tx...');

      const tx = await this.contract.askQuestion(
        tokenAddress,
        bountyWei,
        deadline,
        uri,
        {
          value: bountyWei, // ETH bounty
          gasLimit: 3_000_000,
        },
      );

      console.log(`⏳ Waiting for confirmation... TX Hash: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse event QuestionAsked(uint256 indexed questionId, ...)
      let emittedQId: number | null = null;

      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed && parsed.name === 'QuestionAsked') {
            const qid =
              parsed.args.questionId ?? parsed.args.qid ?? parsed.args[0];
            emittedQId = Number(qid);
            console.log(
              `✅ Event parsed: QuestionAsked => questionId=${emittedQId}`,
            );
            break;
          }
        } catch {
          // skip unrelated logs
        }
      }

      if (emittedQId === null) {
        console.warn('⚠️ No QuestionAsked event found in transaction logs.');
      }

      return { tx, receipt, chainQId: emittedQId };
    } catch (err) {
      console.error('❌ askQuestion failed:', err);
      throw new BadRequestException('Failed to send askQuestion transaction');
    }
  }

  async fundMore(chainQId: number, addWei: bigint) {
    const tx = await this.contract.fundMore(chainQId, addWei, {
      value: addWei,
    });
    return await tx.wait();
  }

  async reduceBounty(chainQId: number, reduceWei: bigint) {
    const tx = await this.contract.reduceBounty(chainQId, reduceWei);
    return await tx.wait();
  }

  async cancelQuestion(chainQId: number) {
    const tx = await this.contract.cancelQuestion(chainQId);
    return await tx.wait();
  }

  async rewardUser(questionId: number, answererAddress: string) {
    if (!answererAddress)
      throw new BadRequestException('Missing wallet address');
    console.log(`🔸 Rewarding ${answererAddress} for question ${questionId}`);
    const tx = await this.contract.rewardUser(
      BigInt(questionId),
      answererAddress,
    );
    const receipt = await tx.wait();
    console.log(`✅ Reward confirmed in block ${receipt.blockNumber}`);
    return receipt;
  }

  async answerQuestion(questionId: number, content: string) {
    const tx = await this.contract.answerQuestion(BigInt(questionId), content);
    const receipt = await tx.wait();
    return receipt;
  }

  async fundBounty(questionId: number, amountWei: bigint) {
    const tx = await this.contract.fundBounty(BigInt(questionId), {
      value: amountWei,
    });
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }
}
