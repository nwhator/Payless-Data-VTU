import { useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  function show(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3500);
  }
  return { message, show };
}
