import { useCallback, useState } from "react";

const WALLET_ENDPOINT = "/api/wallet";

// Define the possible backend response shape
interface WalletResponse {
  wallet?: number | { balance?: number } | string | null;
  balance?: number | string | null;
}

export function useWallet(initialBalance = 0) {
  const [balance, setBalance] = useState<number>(initialBalance);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(WALLET_ENDPOINT, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setBalance(0);
          setLoading(false);
          return;
        }
        const txt = await res.text();
        throw new Error(txt || `Failed to fetch wallet: ${res.status}`);
      }

      const json = (await res.json()) as WalletResponse;

      if (json.wallet !== undefined) {
        const walletValue = json.wallet;

        let val = 0;
        if (typeof walletValue === "number") {
          val = walletValue;
        } else if (
          typeof walletValue === "object" &&
          walletValue !== null &&
          typeof walletValue.balance === "number"
        ) {
          val = walletValue.balance;
        } else {
          val = Number(walletValue);
        }

        setBalance(Number.isFinite(val) ? val : 0);
      } else if (json.balance !== undefined) {
        setBalance(Number(json.balance ?? 0));
      } else {
        setBalance(0);
      }
    } catch (err) {
      console.error("Wallet fetch failed:", err);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return { balance, setBalance, loading, fetchWallet };
}
