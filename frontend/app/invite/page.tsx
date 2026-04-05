"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type State = "loading" | "error" | "done";

/**
 * Inner component that uses useSearchParams — must be wrapped in <Suspense>
 * to satisfy Next.js static generation requirements in standalone output mode.
 */
function InviteFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setState("error");
      setErrorMsg("No invite token found in the URL. Check your invite link.");
      return;
    }

    // Exchange the invite token for a recruiter JWT.
    fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_token: token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail ?? `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        // Store the recruiter JWT in sessionStorage so it persists across
        // navigation within this tab but not across sessions.
        sessionStorage.setItem("recruiter_token", data.access_token);
        sessionStorage.setItem("recruiter_id", data.recruiter_id);
        setState("done");
        router.replace("/chat");
      })
      .catch((err) => {
        setState("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      });
  }, [searchParams, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      {state === "loading" && (
        <>
          <p className="mb-2 text-sm font-medium text-zinc-300">
            Validating your invite…
          </p>
          <p className="text-xs text-zinc-600">You&apos;ll be redirected shortly.</p>
        </>
      )}

      {state === "error" && (
        <>
          <h1 className="mb-3 text-lg font-semibold text-white">
            Invalid invite
          </h1>
          <p className="mb-6 text-sm text-zinc-400">{errorMsg}</p>
          <p className="text-xs text-zinc-600">
            Contact Laud to get a fresh invite link.
          </p>
        </>
      )}

      {state === "done" && (
        <p className="text-sm text-zinc-400">Redirecting to chat…</p>
      )}
    </div>
  );
}

/**
 * Suspense wrapper required because InviteFlow uses useSearchParams().
 * Without this, next build fails in standalone output mode.
 */
export default function InvitePage() {
  return (
    <Suspense>
      <InviteFlow />
    </Suspense>
  );
}
