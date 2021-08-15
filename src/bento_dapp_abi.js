var bento_dapp_abi = [
	{
		"inputs": [],
		"name": "BENTOBOX_MASTER_CONTRACT_ADDRESS",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "BentoMasterContract",
		"outputs": [
			{
				"internalType": "contract IBentoBoxV1",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token_address",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "user_address",
				"type": "address"
			}
		],
		"name": "BentoTokenBalanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "token_balance",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "SUSHISWAP_ROUTER",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "USDC_ADDRESS",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "WETH_ADDRESS",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token_address",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "spender_address",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount_to_approve",
				"type": "uint256"
			}
		],
		"name": "approve_spending",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount_",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "token_address",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "address_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "address_to",
				"type": "address"
			}
		],
		"name": "depositToBento",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token_address",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "address_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "address_to",
				"type": "address"
			}
		],
		"name": "depositTokenBalanceToBento",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getTotalShares",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "totalNumberOfShares",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getUserShares",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "userShares",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "registerProtocol",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "sushiSwapRouter",
		"outputs": [
			{
				"internalType": "contract IUniswapV2Router02",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_amountIn",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_amountOutMin",
				"type": "uint256"
			},
			{
				"internalType": "address[]",
				"name": "_path",
				"type": "address[]"
			},
			{
				"internalType": "address",
				"name": "_acct",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_deadline",
				"type": "uint256"
			}
		],
		"name": "swap",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalNumberOfShares",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token_address",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_share",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "address_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "address_to",
				"type": "address"
			}
		],
		"name": "transfer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "newSharesToBeAdded",
				"type": "uint256"
			}
		],
		"name": "updateSharesOnDeposit",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "updateSharesOnWithdrawal",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userNumberOfShares",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount_",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "token_address",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "address_from",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "address_to",
				"type": "address"
			}
		],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount_",
				"type": "uint256"
			}
		],
		"name": "withdraw_matic",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
]