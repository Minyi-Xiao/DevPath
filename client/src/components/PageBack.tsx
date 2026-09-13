import { ArrowLeft } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getDefaultBackTo } from '../lib/pageBack';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const PageBackContext = createContext<{
  backTo: string | null;
  setBackTo: (to: string | null) => void;
}>({
  backTo: null,
  setBackTo: () => {},
});

export function PageBackProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const defaultBackTo = useMemo(() => getDefaultBackTo(location.pathname), [location.pathname]);
  const [override, setOverride] = useState<string | null>(null);

  useEffect(() => {
    setOverride(null);
  }, [location.pathname]);

  return (
    <PageBackContext.Provider value={{ backTo: override ?? defaultBackTo, setBackTo: setOverride }}>
      {children}
    </PageBackContext.Provider>
  );
}

export function usePageBackTo(to: string | null) {
  const { setBackTo } = useContext(PageBackContext);

  useEffect(() => {
    if (!to) {
      return;
    }

    setBackTo(to);
    return () => setBackTo(null);
  }, [setBackTo, to]);
}

export function PageBackButton() {
  const { backTo } = useContext(PageBackContext);

  if (!backTo) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link to={backTo} aria-label="Back">
            <ArrowLeft />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Back
      </TooltipContent>
    </Tooltip>
  );
}
