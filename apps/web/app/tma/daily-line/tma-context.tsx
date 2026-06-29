"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface TmaState {
  token: string | null;
  userId: string | null;
  displayName: string | null;
  groupId: string | null;
  inlineMessageId: string | null;
  loading: boolean;
  error: string | null;
}

const TmaContext = createContext<TmaState>({
  token: null,
  userId: null,
  displayName: null,
  groupId: null,
  inlineMessageId: null,
  loading: true,
  error: null,
});

export function useTma() {
  return useContext(TmaContext);
}

export function TmaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TmaState>({
    token: null,
    userId: null,
    displayName: null,
    groupId: null,
    inlineMessageId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;

    // Games API fallback: no WebApp SDK, but URL has ?game=1&uid=...
    if (!webapp?.initData) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("game") === "1" && params.get("uid")) {
        const imid = params.get("imid") || null;
        fetch("/api/goalline/tma-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameMode: true,
            userId: params.get("uid"),
            displayName: params.get("name") || "Player",
            chatId: params.get("chat") || null,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.error) {
              setState((s) => ({ ...s, loading: false, error: data.error }));
              return;
            }
            setState({
              token: data.token,
              userId: data.userId,
              displayName: data.displayName,
              groupId: data.groupId ?? null,
              inlineMessageId: imid,
              loading: false,
              error: null,
            });
          })
          .catch(() => {
            setState((s) => ({ ...s, loading: false, error: "Auth failed" }));
          });
        return;
      }

      setState((s) => ({ ...s, loading: false, error: "Not running inside Telegram" }));
      return;
    }

    fetch("/api/goalline/tma-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: webapp.initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setState((s) => ({ ...s, loading: false, error: data.error }));
          return;
        }
        setState({
          token: data.token,
          userId: data.userId,
          displayName: data.displayName,
          groupId: data.groupId ?? null,
          inlineMessageId: null,
          loading: false,
          error: null,
        });
        webapp.ready();
        webapp.expand();
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false, error: "Auth failed" }));
      });
  }, []);

  return (
    <TmaContext.Provider value={state}>
      {state.loading ? (
        <div className="flex min-h-dvh items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : (
        children
      )}
    </TmaContext.Provider>
  );
}
