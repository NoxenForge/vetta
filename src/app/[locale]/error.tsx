"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Trending page error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-20 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Unable to load trending repositories. Please try again later.
      </p>
      <Button onClick={reset} variant="outline" className="mt-4">
        Try again
      </Button>
    </main>
  );
}
