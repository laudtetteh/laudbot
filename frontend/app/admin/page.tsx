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
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="mb-1 text-xl font-semibold text-white">Admin login</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Owner-only access. Enter your credentials to continue.
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
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

  // When a mode gets globally disabled, deselect it from the current selection.
  useEffect(() => {
    if (!modesConfig) return;
    setAllowedModes((prev) => {
      const next = prev.filter((m) => modesConfig[m]);
      return next;
    });
  }, [modesConfig]);

  function toggleMode(mode: Mode) {
    setAllowedModes((prev) => {
      const next = prev.includes(mode)
        ? prev.filter((m) => m !== mode)
        : [...prev, mode];
      // Clear default if it was deselected.
      if (!next.includes(defaultMode as Mode)) setDefaultMode("");
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
    <section className="mb-10">
      <h2 className="mb-1 text-sm font-medium text-zinc-300">Send invite</h2>
      <p className="mb-6 text-xs text-zinc-500">
        Generate a one-time invite link. Choose which modes the recipient can access
        and whether they can switch modes during their session.
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {inviteState === "done" && result ? (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Invite link generated for{" "}
              <span className="font-medium text-zinc-200">{result.email}</span>
            </p>

            <div className="flex items-stretch gap-2">
              <input
                type="text"
                readOnly
                value={result.invite_url}
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 outline-none"
              />
              <button
                onClick={handleCopy}
                className="rounded-md bg-zinc-700 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-600 transition-colors"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Generate another
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                required
                disabled={inviteState === "generating"}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Note{" "}
                <span className="font-normal text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Acme Corp — senior eng role"
                disabled={inviteState === "generating"}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Allowed modes */}
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Allowed modes
              </label>
              <div className="flex flex-wrap gap-3">
                {ALL_MODES.map((mode) => {
                  const isEnabled = globEnabled(mode);
                  const isChecked = allowedModes.includes(mode);
                  return (
                    <label
                      key={mode}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                        !isEnabled
                          ? "cursor-not-allowed border-zinc-800 text-zinc-600"
                          : isChecked
                          ? "border-zinc-500 bg-zinc-800 text-zinc-200"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-zinc-300"
                        checked={isChecked}
                        disabled={!isEnabled || inviteState === "generating"}
                        onChange={() => isEnabled && toggleMode(mode)}
                      />
                      {MODE_LABELS[mode]}
                      {!isEnabled && (
                        <span className="text-zinc-700">(disabled)</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Default mode */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Default mode
              </label>
              <select
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value as Mode)}
                required
                disabled={allowedModes.length === 0 || inviteState === "generating"}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
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

            {/* Can switch modes toggle */}
            <label className="flex cursor-pointer items-center gap-3">
              <div
                onClick={() => setCanSwitch((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  canSwitch ? "bg-zinc-400" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    canSwitch ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-xs text-zinc-400">
                Allow recipient to switch modes
                <span className="ml-1 text-zinc-600">
                  (starts a new conversation each time)
                </span>
              </span>
            </label>

            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={inviteState === "generating"}
                className="rounded-md bg-zinc-700 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {inviteState === "generating" ? "Generating…" : "Generate invite"}
              </button>

              {inviteState === "error" && errorMessage && (
                <span className="text-sm text-red-400">{errorMessage}</span>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Global mode settings section
// ---------------------------------------------------------------------------

/**
 * Shows a toggle per mode to enable/disable it globally.
 * Receives modesConfig from AdminControls and calls onModesChange on update
 * so the invite form stays in sync automatically.
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
    // Optimistic update.
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
      // Revert optimistic update.
      onModesChange(modesConfig);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-sm font-medium text-zinc-300">Mode settings</h2>
      <p className="mb-6 text-xs text-zinc-500">
        Enable or disable modes globally. Disabled modes are hidden from new invites
        and rejected by the API.
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        {modesConfig ? (
          <div className="space-y-3">
            {ALL_MODES.map((mode) => (
              <div key={mode} className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{MODE_LABELS[mode]}</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <div
                    onClick={() => toggleMode(mode)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      modesConfig[mode] ? "bg-zinc-400" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        modesConfig[mode] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {modesConfig[mode] ? "On" : "Off"}
                  </span>
                </label>
              </div>
            ))}

            {saveState === "error" && errorMessage && (
              <p className="pt-2 text-xs text-red-400">{errorMessage}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Loading…</p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Mode overlay editor section
// ---------------------------------------------------------------------------

/**
 * One textarea per mode. Each mode's overlay is saved independently.
 * Overlay content is injected alongside the base system prompt for chat requests.
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
  // Stored as newline-separated strings for easy textarea editing.
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

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-sm font-medium text-zinc-300">Mode overlays &amp; prompts</h2>
      <p className="mb-6 text-xs text-zinc-500">
        Configure the system prompt overlay and suggested prompts for each mode.
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        {/* Mode tabs */}
        <div className="flex border-b border-zinc-800">
          {ALL_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveTab(mode)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === mode
                  ? "border-b-2 border-zinc-300 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        <div className="space-y-6 p-6">
          {/* Overlay editor */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              System prompt overlay
            </label>
            <p className="mb-2 text-xs text-zinc-600">
              Appended to the base system prompt when this mode is active. Leave blank to use only the base.
            </p>
            <textarea
              value={overlays[activeTab]}
              onChange={(e) =>
                setOverlays((prev) => ({ ...prev, [activeTab]: e.target.value }))
              }
              placeholder={`Overlay instructions for ${MODE_LABELS[activeTab]} mode…`}
              rows={7}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 font-mono"
            />
            <div className="mt-2 flex items-center gap-4">
              <button
                onClick={() => handleSaveOverlay(activeTab)}
                disabled={overlaySaveStates[activeTab] === "saving"}
                className="rounded-md bg-zinc-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {overlaySaveStates[activeTab] === "saving" ? "Saving…" : "Save overlay"}
              </button>
              {overlaySaveStates[activeTab] === "saved" && <span className="text-xs text-emerald-400">✓ Saved</span>}
              {overlaySaveStates[activeTab] === "error" && <span className="text-xs text-red-400">Save failed</span>}
            </div>
          </div>

          {/* Suggested prompts editor */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Suggested prompts
            </label>
            <p className="mb-2 text-xs text-zinc-600">
              One prompt per line. Shown as clickable chips in the chat empty state.
            </p>
            <textarea
              value={prompts[activeTab]}
              onChange={(e) =>
                setPrompts((prev) => ({ ...prev, [activeTab]: e.target.value }))
              }
              placeholder={`e.g. What's Laud's engineering background?\nWhat kind of roles is he looking for?`}
              rows={4}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500"
            />
            <div className="mt-2 flex items-center gap-4">
              <button
                onClick={() => handleSavePrompts(activeTab)}
                disabled={promptSaveStates[activeTab] === "saving"}
                className="rounded-md bg-zinc-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {promptSaveStates[activeTab] === "saving" ? "Saving…" : "Save prompts"}
              </button>
              {promptSaveStates[activeTab] === "saved" && <span className="text-xs text-emerald-400">✓ Saved</span>}
              {promptSaveStates[activeTab] === "error" && <span className="text-xs text-red-400">Save failed</span>}
            </div>
          </div>
        </div>
      </div>
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
    <section className="mb-10">
      <h2 className="mb-1 text-sm font-medium text-zinc-300">LLM Provider</h2>
      <p className="mb-6 text-xs text-zinc-500">
        Choose which AI provider and model answers questions. Changes take effect
        immediately — no restart needed.
      </p>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400">
          {loadError}
        </div>
      )}

      {config && (
        <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Provider
            </label>
            <div className="flex gap-3">
              {Object.keys(config.available_models).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    selectedProvider === provider
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {provider === "claude" ? "Claude (Anthropic)" : "OpenAI"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setSaveState("idle");
              }}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-zinc-500"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={saveState === "saving" || !isDirty}
              className="rounded-md bg-zinc-700 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {saveState === "saving" ? "Saving…" : "Save"}
            </button>

            {saveState === "saved" && (
              <span className="text-sm text-emerald-400">
                ✓ Active — next chat will use {selectedProvider} / {selectedModel}
              </span>
            )}
            {saveState === "error" && errorMessage && (
              <span className="text-sm text-red-400">{errorMessage}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Admin controls (shown after login)
// ---------------------------------------------------------------------------

function AdminControls({ token, onLogout }: { token: string; onLogout: () => void }) {
  // Lifted here so InviteSection and GlobalModesSection share one source of truth.
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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-white">Admin</h1>
          <p className="text-sm text-zinc-500">
            Owner-only controls for managing LaudBot&apos;s behaviour.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
        >
          Sign out
        </button>
      </div>

      <InviteSection token={token} onSessionExpired={onLogout} modesConfig={modesConfig} />
      <GlobalModesSection token={token} onSessionExpired={onLogout} modesConfig={modesConfig} onModesChange={setModesConfig} />
      <OverlayEditorSection token={token} onSessionExpired={onLogout} />
      <LLMProviderSection token={token} onSessionExpired={onLogout} />

      {/* Planned features */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-zinc-300">Coming soon</h2>
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
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
            >
              <h3 className="mb-2 text-sm font-medium text-zinc-500">{title}</h3>
              <p className="text-xs leading-relaxed text-zinc-600">{description}</p>
            </div>
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
