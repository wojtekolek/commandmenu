import { useCallback, useEffect, useRef, useState } from "react";

export const useToast = () => {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string) => {
    clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toast, show };
};
