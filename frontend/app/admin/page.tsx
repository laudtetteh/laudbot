"use client";

import { useEffect, useState } from "react";

interface LLMConfigResponse {
  provider: string;
  model: string;
  available_models: Record<string, string[]>;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type AuthState = "checking" | "unauthenticated" | "authenticated";

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

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

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
// Admin controls (shown after login)
// ---------------------------------------------------------------------------

function AdminControls({ token, onLogout }: { token: string; onLogout: () => void }) {
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
        if (res.status === 401) { onLogout(); return; }
        return res.json();
      })
      .then((data?: LLMConfigResponse) => {
        if (!data) return;
        setConfig(data);
        setSelectedProvider(data.provider);
        setSelectedModel(data.model);
      })
      .catch(() => setLoadError("Failed to load config. Is the backend running?"));
  }, [token, onLogout]);

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

      if (res.status === 401) { onLogout(); return; }

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

      {/* LLM Provider config */}
      <section className="mb-10">
        <h2 className="mb-1 text-sm font-medium text-zinc-300">LLM Provider</h2>
        <p className="mb-6 text-xs text-zinc-500">
          Choose which AI provider and model answers recruiter questions. Changes take
          effect immediately — no restart needed.
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
                onChange={(e) => { setSelectedModel(e.target.value); setSaveState("idle"); }}
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

      {/* Planned features */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-zinc-300">Coming soon</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "System prompt editor", description: "Edit what LaudBot knows without touching files." },
            { title: "Source management", description: "Approve, revoke, and review content LaudBot is allowed to use." },
            { title: "Response review", description: "Audit past responses and flag anything that needs correction." },
          ].map(({ title, description }) => (
            <div key={title} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
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
