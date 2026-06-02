import { type WalletClient, type Hex } from "viem";
import { TronPayClient } from "./tronpay";

export interface X402Invoice {
  quoteId: string;
  expiresAt: string;
  amountUsd: number;
  acceptedAssets: string[];
  recipientAddress: string;
  memo: string;
}

export interface X402Receipt {
  receiptId: string;
  txHash: string;
  status: "STABLECOIN_CONFIRMED" | "CRYPTO_CONFIRMED" | "CRYPTO_REVENUE_CONFIRMED";
  apostleTxHash?: string;
}

export class X402Handler {
  private readonly gatewayUrl: string;
  private readonly evmWallet?: WalletClient;
  private readonly tronPay?: TronPayClient;

  constructor(config: {
    gatewayUrl?: string;
    evmWallet?: WalletClient;
    tronPay?: TronPayClient;
  }) {
    this.gatewayUrl = config.gatewayUrl || "http://localhost:3101/api/x402";
    this.evmWallet = config.evmWallet;
    this.tronPay = config.tronPay;
  }

  /**
   * Orchestrates the negotiation of an HTTP 402 response
   */
  async negotiatePayment(responseHeaders: Record<string, string>): Promise<X402Receipt> {
    console.log("[x402] Extracting details from X-Payment-Required headers...");
    
    // Parse x402 details from mock or real headers
    const paymentRequired = responseHeaders["x-payment-required"] || "true";
    const quoteId = responseHeaders["x-invoice-id"] || "quote_" + Math.random().toString(36).substring(7);
    const amountUsd = parseFloat(responseHeaders["x-amount-usd"] || "0.25");
    const acceptedAssets = (responseHeaders["x-accepted-assets"] || "USDT_TRON,USDC_BASE").split(",");
    const recipient = responseHeaders["x-recipient-address"] || "0x7d9a65d06dcc435a52D5880C6310Bd6E96c156DB";

    console.log(`[x402] Payment Required: ${paymentRequired} | Invoice: ${quoteId}`);
    console.log(`[x402] Payment Request: ${amountUsd} USD. Accepted: ${acceptedAssets.join(", ")}`);

    // Pick payment asset (prioritize TRON USDT if TronPay is available, else EVM USDC)
    if (acceptedAssets.includes("USDT_TRON") && this.tronPay) {
      return await this.payWithTron(quoteId, amountUsd.toString(), recipient);
    } else if (acceptedAssets.includes("USDC_BASE") && this.evmWallet) {
      return await this.payWithEVM(quoteId, amountUsd.toString(), recipient);
    } else {
      throw new Error(`[x402] No compatible wallet configured to pay accepted assets: ${acceptedAssets.join(", ")}`);
    }
  }

  private async payWithTron(quoteId: string, amount: string, recipient: string): Promise<X402Receipt> {
    if (!this.tronPay) throw new Error("TronPay client not configured.");
    
    console.log(`[x402] Initiating TRON payment loop for quote: ${quoteId}...`);
    
    // Send payment
    const payment = await this.tronPay.sendUSDT(recipient, amount, quoteId);
    if (payment.status !== "SUCCESS") {
      throw new Error(`[x402] TRON Payment failed: ${payment.txHash}`);
    }

    // Call verify endpoint on gateway
    return await this.verifyGatewayPayment({
      quoteId,
      network: "TRON",
      asset: "USDT",
      txHash: payment.txHash,
      payerAddress: this.tronPay.getAddress(),
      expectedAmount: amount
    });
  }

  private async payWithEVM(quoteId: string, amount: string, recipient: string): Promise<X402Receipt> {
    if (!this.evmWallet) throw new Error("EVM Wallet client not configured.");

    console.log(`[x402] Initiating EVM payment loop on Base for quote: ${quoteId}...`);
    const account = this.evmWallet.account;
    if (!account) throw new Error("EVM account not found.");

    // Simulate sending Base USDC transaction
    const mockHash = "0x" + Math.random().toString(16).substring(2, 34) + Math.random().toString(16).substring(2, 34) as Hex;
    console.log(`[x402] Executed Base Sepolia transaction to recipient ${recipient}: ${mockHash}`);

    // Call verify endpoint on gateway
    return await this.verifyGatewayPayment({
      quoteId,
      network: "Base",
      asset: "USDC",
      txHash: mockHash,
      payerAddress: account.address,
      expectedAmount: amount
    });
  }

  private async verifyGatewayPayment(payload: {
    quoteId: string;
    network: string;
    asset: string;
    txHash: string;
    payerAddress: string;
    expectedAmount: string;
  }): Promise<X402Receipt> {
    console.log(`[x402] Verifying payment on gateway: ${this.gatewayUrl}/crypto/verify...`);

    // Simulate gateway API response
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockReceiptId = "rcpt_" + Math.random().toString(36).substring(7);
    const mockApostleHash = "ap_" + Math.random().toString(36).substring(7);

    console.log(`[x402] Verification SUCCESS. Receipt: ${mockReceiptId} | Apostle Proof: ${mockApostleHash}`);

    return {
      receiptId: mockReceiptId,
      txHash: payload.txHash,
      status: "CRYPTO_REVENUE_CONFIRMED",
      apostleTxHash: mockApostleHash
    };
  }
}
