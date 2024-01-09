import { useState, useEffect } from "react";

export function useOptimisticUpdate<T>(
  index: number,
  value: T,
  updateFunction: (value: T) => Promise<unknown>,
) {
  const [cachedValue, setCachedValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const optimisticValue = cachedValue ?? value;

  if (index === 0)
    console.log("cachedValue", optimisticValue, cachedValue, value);

  useEffect(() => {
    setCachedValue(null);
  }, [value]);

  const handleUpdate = async (newValue: T) => {
    console.log("handleUpdate", newValue);
    setLoading(true);
    setCachedValue(newValue);
    await updateFunction(newValue);
    setLoading(false);
  };

  return { optimisticValue, loading, handleUpdate };
}
