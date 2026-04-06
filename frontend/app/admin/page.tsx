"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LLMConfigResponse {
  provider: string;
  model: string;
  available_models: Record<string, string[]>;
}

interface InviteResult {
  invite_url: string;
  email: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type AuthState = "checking" | "unauthenticated" | "authenticated";
type InviteState = "idle" | "generating" | "done" | "error";

const ALL_MODES = ["recruiter", "coworker", "buddy"] as const;
type Mode = (typeof ALL_MODES)[number];

const MODE_LABELS: Record<Mode, string> = {
  recruiter: "Recruiter (professional, but friendly)",
  coworker: "Co-worker (fellow engineer)",
  buddy: "Buddy (constantly roasting laud)",
};

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Section header with title + optional description */
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{description}</p>
      )}
    </div>
  );
}

/** Consistent card wrapper */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-5 dark:border-zinc-800/70 dark:bg-zinc-900/60 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin login form
// ---------------------------------------------------------------------------

function LoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Login failed (${res.status})`);
      }

      const data = await res.json();
      sessionStorage.setItem("admin_token", data.access_token);
      onSuccess(data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-white">Admin login</h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-500">
          Owner-only access. Enter your credentials to continue.
        </p>

        <Card>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-lg border border-zinc-300/60 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-600 dark:focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-zinc-300/60 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-600 dark:focus:border-zinc-500"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200/60 bg-red-50/60 px-3 py-2 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Send invite section
// ---------------------------------------------------------------------------

/**
 * Lets the admin generate an invite link with per-invite mode config.
 * Receives modesConfig from AdminControls so it stays in sync with global toggles.
 */
function InviteSection({
  token,
  onSessionExpired,
  modesConfig,
}: {
  token: string;
  onSessionExpired: () => void;
  modesConfig: Record<Mode, boolean> | null;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [allowedModes, setAllowedModes] = useState<Mode[]>([]);
  const [defaultMode, setDefaultMode] = useState<Mode | "">("");
  const [canSwitch, setCanSwitch] = useState(false);
  const [inviteState, setInviteState] = useState<InviteState>("idle");
  const [result, setResult] = useState<InviteResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync allowed modes with global mode config.
  // - Remove any mode that has been globally disabled.
  // - If exactly one mode is globally enabled, auto-select it and set it as default.
  useEffect(() => {
    if (!modesConfig) return;
    const globallyEnabled = ALL_MODES.filter((m) => modesConfig[m]);
    if (globallyEnabled.length === 1) {
      setAllowedModes(globallyEnabled);
      setDefaultMode(globallyEnabled[0]);
    } else {
      setAllowedModes((prev) => prev.filter((m) => modesConfig[m]));
      setDefaultMode((prev) =>
        prev && modesConfig[prev as Mode] ? prev : ""
      );
    }
  }, [modesConfig]);

  function toggleMode(mode: Mode) {
    setAllowedModes((prev) => {
      const next = prev.includes(mode)
        ? prev.filter((m) => m !== mode)
        : [...prev, mode];
      // Auto-select default when only one mode remains; clear if current default was removed.
      if (next.length === 1) {
        setDefaultMode(next[0]);
      } else if (!next.includes(defaultMode as Mode)) {
        setDefaultMode("");
      }
      return next;
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (allowedModes.length === 0) {
      setErrorMessage("Select at least one mode.");
      setInviteState("error");
      return;
    }
    if (!defaultMode) {
      setErrorMessage("Select a default mode.");
      setInviteState("error");
      return;
    }

    setInviteState("generating");
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          note: note || undefined,
          allowed_modes: allowedModes,
          default_mode: defaultMode,
          can_switch_modes: canSwitch,
        }),
      });

      if (res.status === 401) { onSessionExpired(); return; }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult({ invite_url: data.invite_url, email: data.email });
      setInviteState("done");
      setEmail("");
      setNote("");
      setAllowedModes([]);
      setDefaultMode("");
      setCanSwitch(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setInviteState("error");
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleReset() {
    setInviteState("idle");
    setResult(null);
    setErrorMessage(null);
  }

  const globEnabled = (m: Mode) => modesConfig === null || modesConfig[m] !== false;

  return (
    <section className="mb-8">
      <SectionHeader
        title="Send invite"
        description="Generate a one-time invite link. Choose which modes the recipient can access and whether they can switch modes during their session."
      />

      <Card>
        {inviteState === "done" && result ? (
          <div className="animate-fade-in space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Invite link generated for{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{result.email}</span>
            </p>

            <div className="flex items-stretch gap-2">
              <input
                type="text"
                readOnly
                value={result.invite_url}
                className="flex-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-600 outline-none dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-300"
              />
              <button
                onClick={handleCopy}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              ← Generate another
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                required
                disabled={inviteState === "generating"}
                className="w-full rounded-lg border border-zinc-300/60 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-600 dark:focus:border-zinc-500 sm:max-w-sm"
              />
            </div>

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Note{" "}
                <span className="font-normal text-zinc-400 dark:text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Acme Corp — senior eng role"
                disabled={inviteState === "generating"}
                className="w-full rounded-lg border border-zinc-300/60 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-600 dark:focus:border-zinc-500 sm:max-w-sm"
              />
            </div>

            {/* Allowed modes */}
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Allowed modes
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_MODES.map((mode) => {
                  const isEnabled = globEnabled(mode);
                  const isChecked = allowedModes.includes(mode);
                  const globallyEnabled = ALL_MODES.filter((m) => globEnabled(m));
                  // Lock the checkbox if it's the only globally enabled mode — no choice to make.
                  const isLocked = globallyEnabled.length === 1 && globallyEnabled[0] === mode;
                  return (
                    <label
                      key={mode}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                        !isEnabled
                          ? "cursor-not-allowed border-zinc-200/60 text-zinc-400 dark:border-zinc-800/60 dark:text-zinc-600"
                          : isLocked
                          ? "cursor-default border-zinc-400 bg-zinc-100 text-zinc-700 shadow-sm dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-200"
                          : isChecked
                          ? "cursor-pointer border-zinc-400 bg-zinc-100 text-zinc-700 shadow-sm dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-200"
                          : "cursor-pointer border-zinc-200/60 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700/60 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-zinc-300"
                        checked={isChecked}
                        disabled={!isEnabled || isLocked || inviteState === "generating"}
                        onChange={() => isEnabled && !isLocked && toggleMode(mode)}
                      />
                      {MODE_LABELS[mode]}
                      {!isEnabled && (
                        <span className="text-zinc-400 dark:text-zinc-700">(disabled)</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Default mode */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Default mode
              </label>
              <select
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value as Mode)}
                required
                disabled={allowedModes.length === 0 || allowedModes.length === 1 || inviteState === "generating"}
                className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-500"
              >
                <option value="" disabled>
                  Select default…
                </option>
                {allowedModes.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>

            {/* Can switch modes toggle — only meaningful if >1 mode is selected */}
            <label className={`flex items-center gap-3 ${allowedModes.length > 1 ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}>
              <div
                onClick={() => allowedModes.length > 1 && setCanSwitch((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  canSwitch && allowedModes.length > 1 ? "bg-zinc-600 dark:bg-zinc-400" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    canSwitch && allowedModes.length > 1 ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Allow recipient to switch modes
                <span className="ml-1 text-zinc-400 dark:text-zinc-600">
                  (starts a new conversation each time)
                </span>
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={inviteState === "generating"}
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                {inviteState === "generating" ? "Generating…" : "Generate invite"}
              </button>

              {inviteState === "error" && errorMessage && (
                <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
              )}
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Global mode settings section
// ---------------------------------------------------------------------------

/**
 * Shows a toggle per mode to enable/disable it globally.
 */
function GlobalModesSection({
  token,
  onSessionExpired,
  modesConfig,
  onModesChange,
}: {
  token: string;
  onSessionExpired: () => void;
  modesConfig: Record<Mode, boolean> | null;
  onModesChange: (modes: Record<Mode, boolean>) => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function toggleMode(mode: Mode) {
    if (!modesConfig) return;
    const next = { ...modesConfig, [mode]: !modesConfig[mode] };
    onModesChange(next);
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/modes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ modes: { [mode]: next[mode] } }),
      });

      if (res.status === 401) { onSessionExpired(); return; }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);

      const data = await res.json();
      onModesChange(data.modes);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setSaveState("error");
      onModesChange(modesConfig);
    }
  }

  return (
    <section className="mb-8">
      <SectionHeader
        title="Mode settings"
        description="Enable or disable modes globally. Disabled modes are hidden from new invites and rejected by the API."
      />

      <Card>
        {modesConfig ? (
          <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {ALL_MODES.map((mode) => (
              <div key={mode} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{MODE_LABELS[mode]}</span>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <div
                    onClick={() => toggleMode(mode)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      modesConfig[mode] ? "bg-zinc-600 dark:bg-zinc-400" : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        modesConfig[mode] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span className="w-6 text-xs text-zinc-400 dark:text-zinc-500">
                    {modesConfig[mode] ? "On" : "Off"}
                  </span>
                </label>
              </div>
            ))}

            {saveState === "error" && errorMessage && (
              <p className="pt-3 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-600">Loading…</p>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Mode overlay editor section
// ---------------------------------------------------------------------------

/**
 * One textarea per mode. Each mode's overlay is saved independently.
 */
function OverlayEditorSection({
  token,
  onSessionExpired,
}: {
  token: string;
  onSessionExpired: () => void;
}) {
  const [overlays, setOverlays] = useState<Record<Mode, string>>({
    recruiter: "",
    coworker: "",
    buddy: "",
  });
  const [overlaySaveStates, setOverlaySaveStates] = useState<Record<Mode, SaveState>>({
    recruiter: "idle",
    coworker: "idle",
    buddy: "idle",
  });
  const [prompts, setPrompts] = useState<Record<Mode, string>>({
    recruiter: "",
    coworker: "",
    buddy: "",
  });
  const [promptSaveStates, setPromptSaveStates] = useState<Record<Mode, SaveState>>({
    recruiter: "idle",
    coworker: "idle",
    buddy: "idle",
  });
  const [activeTab, setActiveTab] = useState<Mode>("recruiter");
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    ALL_MODES.forEach((mode) => {
      fetch(`/api/admin/modes/${mode}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (res.status === 401) { onSessionExpired(); return; }
          const data = await res.json();
          setOverlays((prev) => ({ ...prev, [mode]: data.overlay }));
        })
        .catch(() => {/* non-fatal */});

      fetch(`/api/admin/modes/${mode}/prompts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (res.status === 401) { onSessionExpired(); return; }
          const data = await res.json();
          setPrompts((prev) => ({ ...prev, [mode]: (data.prompts as string[]).join("\n") }));
        })
        .catch(() => {/* non-fatal */});
    });
  }, [token, onSessionExpired]);

  async function handleSaveOverlay(mode: Mode) {
    setOverlaySaveStates((prev) => ({ ...prev, [mode]: "saving" }));
    try {
      const res = await fetch(`/api/admin/modes/${mode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ overlay: overlays[mode] }),
      });
      if (res.status === 401) { onSessionExpired(); return; }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setOverlaySaveStates((prev) => ({ ...prev, [mode]: "saved" }));
      setTimeout(() => setOverlaySaveStates((prev) => ({ ...prev, [mode]: "idle" })), 2500);
    } catch {
      setOverlaySaveStates((prev) => ({ ...prev, [mode]: "error" }));
    }
  }

  async function handleSavePrompts(mode: Mode) {
    setPromptSaveStates((prev) => ({ ...prev, [mode]: "saving" }));
    const promptList = prompts[mode].split("\n").map((p) => p.trim()).filter(Boolean);
    try {
      const res = await fetch(`/api/admin/modes/${mode}/prompts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompts: promptList }),
      });
      if (res.status === 401) { onSessionExpired(); return; }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setPromptSaveStates((prev) => ({ ...prev, [mode]: "saved" }));
      setTimeout(() => setPromptSaveStates((prev) => ({ ...prev, [mode]: "idle" })), 2500);
    } catch {
      setPromptSaveStates((prev) => ({ ...prev, [mode]: "error" }));
    }
  }

  // Per-mode placeholder prompts so the textarea is self-documenting.
  const PROMPT_PLACEHOLDERS: Record<Mode, string> = {
    recruiter: "What's Laud's engineering background?\nWhat kind of roles is he looking for?\nHas he worked with AI systems before?",
    coworker: "Walk me through your system design approach.\nHow do you handle tech debt?\nWhat's your take on microservices vs monoliths?",
    buddy: "Roast Laud's career choices.\nWhat's his most embarrassing coding moment?\nBe honest — is he actually good?",
  };

  return (
    <section className="mb-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Mode overlays &amp; prompts</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
            Configure the system prompt overlay and suggested prompts for each mode.
          </p>
        </div>
        <button
          onClick={() => setIsUnlocked((v) => !v)}
          className="mt-0.5 shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
        >
          {isUnlocked ? "Lock" : "Edit"}
        </button>
      </div>

      {/* Collapsed summary — shown by default */}
      {!isUnlocked && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {ALL_MODES.map((mode) => (
              <span
                key={mode}
                className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {MODE_LABELS[mode].split(" (")[0]}
              </span>
            ))}
            <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-600">{ALL_MODES.length} modes</span>
          </div>
        </Card>
      )}

      {/* Full editor — shown only when explicitly unlocked */}
      {isUnlocked && (
        <Card className="p-0 overflow-hidden">
          {/* Mode tabs */}
          <div className="flex overflow-x-auto border-b border-zinc-200/70 dark:border-zinc-800/70">
            {ALL_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveTab(mode)}
                className={`whitespace-nowrap px-4 py-3 text-xs font-medium transition-colors ${
                  activeTab === mode
                    ? "border-b-2 border-zinc-700 text-zinc-800 dark:border-zinc-300 dark:text-zinc-200"
                    : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {/* Overlay editor */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                System prompt overlay
              </label>
              <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-600">
                Appended to the base system prompt when this mode is active. Leave blank to use only the base.
              </p>
              <textarea
                value={overlays[activeTab]}
                onChange={(e) =>
                  setOverlays((prev) => ({ ...prev, [activeTab]: e.target.value }))
                }
                placeholder={`Overlay instructions for ${MODE_LABELS[activeTab]} mode…`}
                rows={7}
                className="w-full rounded-lg border border-zinc-300/60 bg-white px-3 py-2.5 font-mono text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => handleSaveOverlay(activeTab)}
                  disabled={overlaySaveStates[activeTab] === "saving"}
                  className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  {overlaySaveStates[activeTab] === "saving" ? "Saving…" : "Save overlay"}
                </button>
                {overlaySaveStates[activeTab] === "saved" && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                )}
                {overlaySaveStates[activeTab] === "error" && (
                  <span className="text-xs text-red-600 dark:text-red-400">Save failed</span>
                )}
              </div>
            </div>

            {/* Suggested prompts editor */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Suggested prompts
              </label>
              <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-600">
                One prompt per line. Shown as clickable chips in the chat empty state for this mode.
              </p>
              <textarea
                value={prompts[activeTab]}
                onChange={(e) =>
                  setPrompts((prev) => ({ ...prev, [activeTab]: e.target.value }))
                }
                placeholder={PROMPT_PLACEHOLDERS[activeTab]}
                rows={4}
                className="w-full rounded-lg border border-zinc-300/60 bg-white px-3 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => handleSavePrompts(activeTab)}
                  disabled={promptSaveStates[activeTab] === "saving"}
                  className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  {promptSaveStates[activeTab] === "saving" ? "Saving…" : "Save prompts"}
                </button>
                {promptSaveStates[activeTab] === "saved" && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Saved</span>
                )}
                {promptSaveStates[activeTab] === "error" && (
                  <span className="text-xs text-red-600 dark:text-red-400">Save failed</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// LLM provider config section
// ---------------------------------------------------------------------------

function LLMProviderSection({
  token,
  onSessionExpired,
}: {
  token: string;
  onSessionExpired: () => void;
}) {
  const [config, setConfig] = useState<LLMConfigResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/llm-config", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) { onSessionExpired(); return; }
        return res.json();
      })
      .then((data?: LLMConfigResponse) => {
        if (!data) return;
        setConfig(data);
        setSelectedProvider(data.provider);
        setSelectedModel(data.model);
      })
      .catch(() => setLoadError("Failed to load config. Is the backend running?"));
  }, [token, onSessionExpired]);

  function handleProviderChange(provider: string) {
    setSelectedProvider(provider);
    const models = config?.available_models[provider] ?? [];
    setSelectedModel(models[0] ?? "");
    setSaveState("idle");
  }

  async function handleSave() {
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/llm-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel }),
      });

      if (res.status === 401) { onSessionExpired(); return; }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      const updated: LLMConfigResponse = await res.json();
      setConfig(updated);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setSaveState("error");
    }
  }

  const availableModels = config?.available_models[selectedProvider] ?? [];
  const isDirty =
    selectedProvider !== config?.provider || selectedModel !== config?.model;

  return (
    <section className="mb-8">
      <SectionHeader
        title="LLM Provider"
        description="Choose which AI provider and model answers questions. Changes take effect immediately — no restart needed."
      />

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200/60 bg-red-50/60 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-400">
          {loadError}
        </div>
      )}

      {config && (
        <Card>
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Provider
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(config.available_models).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => handleProviderChange(provider)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      selectedProvider === provider
                        ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                    }`}
                  >
                    {provider === "claude" ? "Claude (Anthropic)" : "OpenAI"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setSaveState("idle");
                }}
                className="rounded-lg border border-zinc-300/60 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-white dark:focus:border-zinc-500"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200/60 pt-4 dark:border-zinc-800/60">
              <button
                onClick={handleSave}
                disabled={saveState === "saving" || !isDirty}
                className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                {saveState === "saving" ? "Saving…" : "Save"}
              </button>

              {saveState === "saved" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Active — next chat will use {selectedProvider} / {selectedModel}
                </span>
              )}
              {saveState === "error" && errorMessage && (
                <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
              )}
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// System prompt editor section
// ---------------------------------------------------------------------------

interface SystemPromptResponse {
  content: string;
  source: "database" | "env_var" | "file" | "fallback";
  updated_at: string | null;
}

const SOURCE_LABELS: Record<SystemPromptResponse["source"], string> = {
  database: "Saved in database",
  env_var: "Loaded from environment variable — save here to move it to the database",
  file: "Loaded from file — save here to move it to the database",
  fallback: "Using fallback stub — no prompt has been configured",
};

/**
 * Textarea for reading and updating the base system prompt.
 * Saves to the database and takes effect immediately — no DO secret update needed.
 */
function SystemPromptSection({
  token,
  onSessionExpired,
}: {
  token: string;
  onSessionExpired: () => void;
}) {
  const [data, setData] = useState<SystemPromptResponse | null>(null);
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system-prompt", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) { onSessionExpired(); return; }
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        return res.json();
      })
      .then((d?: SystemPromptResponse) => {
        if (!d) return;
        setData(d);
        setContent(d.content);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load system prompt.");
      });
  }, [token, onSessionExpired]);

  const isDirty = content !== (data?.content ?? "");

  async function handleSave() {
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/system-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (res.status === 401) { onSessionExpired(); return; }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Save failed (${res.status})`);
      }

      const updated: SystemPromptResponse = await res.json();
      setData(updated);
      setContent(updated.content);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setSaveState("error");
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">System Prompt</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
            The base prompt sent to the LLM on every chat request. Saving here takes effect
            immediately — no environment variable update needed.
          </p>
        </div>
        {data && (
          <button
            onClick={() => setIsUnlocked((v) => !v)}
            className="mt-0.5 shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
          >
            {isUnlocked ? "Lock" : "Edit"}
          </button>
        )}
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200/60 bg-red-50/60 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-400">
          {loadError}
        </div>
      )}

      {/* Collapsed summary — shown by default */}
      {data && !isUnlocked && (
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                data.source === "database"
                  ? "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-amber-100/60 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
              }`}
            >
              {data.source === "database" ? "● Database" : "⚠ " + data.source.replace("_", " ")}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{content.length.toLocaleString()} chars</span>
            {data.updated_at && (
              <span className="text-xs text-zinc-400 dark:text-zinc-600">
                Last saved {new Date(data.updated_at).toLocaleString()}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Full editor — shown only when explicitly unlocked */}
      {data && isUnlocked && (
        <Card>
          <div className="space-y-4">
            {/* Source badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                  data.source === "database"
                    ? "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-amber-100/60 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                }`}
              >
                {data.source === "database" ? "● Database" : "⚠ " + data.source.replace("_", " ")}
              </span>
              {data.source !== "database" && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {SOURCE_LABELS[data.source]}
                </span>
              )}
              {data.updated_at && (
                <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-600">
                  Last saved {new Date(data.updated_at).toLocaleString()}
                </span>
              )}
            </div>

            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaveState("idle");
              }}
              rows={20}
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-zinc-300/60 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-zinc-800 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-zinc-500"
            />

            <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200/60 pt-4 dark:border-zinc-800/60">
              <span className="text-xs text-zinc-400 dark:text-zinc-600">
                {content.length.toLocaleString()} chars
              </span>
              <div className="ml-auto flex items-center gap-4">
                {saveState === "saved" && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Saved — takes effect on next chat request
                  </span>
                )}
                {saveState === "error" && errorMessage && (
                  <span className="text-xs text-red-600 dark:text-red-400">{errorMessage}</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving" || !isDirty || !content.trim()}
                  className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  {saveState === "saving" ? "Saving…" : "Save prompt"}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Admin controls (shown after login)
// ---------------------------------------------------------------------------

function AdminControls({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [modesConfig, setModesConfig] = useState<Record<Mode, boolean> | null>(null);

  useEffect(() => {
    fetch("/api/admin/modes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) { onLogout(); return; }
        const data = await res.json();
        setModesConfig(data.modes);
      })
      .catch(() => {/* non-fatal */});
  }, [token, onLogout]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Admin</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            Owner-only controls for managing LaudBot&apos;s behaviour.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="mt-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
        >
          Sign out
        </button>
      </div>

      <InviteSection token={token} onSessionExpired={onLogout} modesConfig={modesConfig} />
      <GlobalModesSection token={token} onSessionExpired={onLogout} modesConfig={modesConfig} onModesChange={setModesConfig} />
      <SystemPromptSection token={token} onSessionExpired={onLogout} />
      <OverlayEditorSection token={token} onSessionExpired={onLogout} />
      <LLMProviderSection token={token} onSessionExpired={onLogout} />

      {/* Planned features */}
      <section>
        <SectionHeader title="Coming soon" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Source management",
              description:
                "Approve, revoke, and review content LaudBot is allowed to use.",
            },
            {
              title: "Response review",
              description:
                "Audit past responses and flag anything that needs correction.",
            },
          ].map(({ title, description }) => (
            <Card key={title}>
              <h3 className="mb-1.5 text-sm font-medium text-zinc-400 dark:text-zinc-500">{title}</h3>
              <p className="text-xs leading-relaxed text-zinc-400 dark:text-zinc-600">{description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — orchestrates auth state
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_token");
    if (stored) {
      setToken(stored);
      setAuthState("authenticated");
    } else {
      setAuthState("unauthenticated");
    }
  }, []);

  function handleLoginSuccess(newToken: string) {
    setToken(newToken);
    setAuthState("authenticated");
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_token");
    setToken(null);
    setAuthState("unauthenticated");
  }

  if (authState === "checking") return null;

  if (authState === "unauthenticated") {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return <AdminControls token={token!} onLogout={handleLogout} />;
}
