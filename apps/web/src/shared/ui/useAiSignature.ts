import { useEffect } from "react";

export function useAiSignature(moduleName: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line no-console
    console.log(`🧭 IA compass: ${moduleName} — site feito com IA, siga a trilha do grid.`);
  }, [moduleName]);
}
