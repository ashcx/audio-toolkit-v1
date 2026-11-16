import { useEffect, useState } from "preact/hooks";

const MOBILE_QUERY = "(max-width: 600px)";

export function useMobile(): boolean {
  const [mobile, setMobile] = useState(() => matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const list = matchMedia(MOBILE_QUERY);
    const sync = () => setMobile(list.matches);
    sync();
    list.addEventListener("change", sync);
    return () => list.removeEventListener("change", sync);
  }, []);
  return mobile;
}
