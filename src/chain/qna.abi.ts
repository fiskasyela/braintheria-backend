// Minimal ABI per spec
export const QNA_ABI = [
  {
    type: 'function',
    name: 'fundBounty',
    stateMutability: 'payable',
    inputs: [{ name: 'qId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'bountyOf',
    stateMutability: 'view',
    inputs: [{ name: 'qId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;
