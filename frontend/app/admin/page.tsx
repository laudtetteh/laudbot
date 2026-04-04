"use client";

import { useEffect, useState } from "react";

interface LLMConfigResponse {
  provider: string;
  model: string;
  available_models: Record<string, string[]>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AdminPage() {
  const [config, setConfig] = useState<LLMConfigResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/llm-config")
      .then((r) => r.json())
      .then((data: LLMConfigResponse) => {
        setConfig(data);
        setSelectedProvider(data.provider);
        setSelectedModel(data.model);
      })
      .catch(() => setLoadError("Failed to load current config. Is the backend running?"));
  }, []);

  function handleProviderChange(provider: string) {
    setSelectedProvider(provider);
    // Reset model to first available for the new provider.
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel }),
      });

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
      <h1 className="mb-1 text-xl font-semibold text-white">Admin</h1>
      <p className="mb-10 text-sm text-zinc-500">
        Owner-only controls for managing LaudBot&apos;s behaviour.
      </p>

      {/* LLM Provider config */}
      <section className="mb-10">
        <h2 className="mb-1 text-sm font-medium text-zinc-300">LLM Provider</h2>
        <p className="mb-6 text-xs text-zinc-500">
          Choose which AI provider and model answers recruiter questions. Changes take effect
          immediately — no restart needed.
        </p>

        {loadError && (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400">
            {loadError}
          </div>
        )}

        {config && (
          <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            {/* Provider selector */}
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

            {/* Model selector */}
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

            {/* Save row */}
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
