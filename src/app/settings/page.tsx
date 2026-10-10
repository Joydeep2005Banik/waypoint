'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Cpu,
  Radio,
  Trash2,
  Info,
  CheckCircle,
  AlertCircle,
  Database,
  Terminal,
  RefreshCw,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { OllamaAIProvider } from '@/services/ai/ollama-provider';
import { AIProviderHealth } from '@/types/ai';

export default function SettingsPage() {
  const [provider, setProvider] = useState<'deterministic' | 'ollama'>('deterministic');
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:1.5b');
  const [gpsAccuracyThreshold, setGpsAccuracyThreshold] = useState(25);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<AIProviderHealth | null>(null);

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthStatus(null);
    try {
      const ollama = new OllamaAIProvider(ollamaUrl, selectedModel);
      const health = await ollama.healthCheck();
      setHealthStatus(health);
    } catch (err: unknown) {
      setHealthStatus({
        isAvailable: false,
        provider: 'ollama',
        model: selectedModel,
        error: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          <span>System Settings & Diagnostics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Hardware sensors, local open-weight AI configuration, and local storage controls
        </p>
      </div>

      {/* AI Provider Architecture Section */}
      <Card variant="elevated" className="space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-slate-200">AI Mission Narration Engine</h2>
          </div>
          <Badge variant={provider === 'deterministic' ? 'neutral' : 'info'} size="sm">
            {provider === 'deterministic' ? 'Rule-Based Offline' : 'Ollama Open-Weight'}
          </Badge>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Open-weight AI strictly enriches pre-departure mission descriptions. Pathfinding, coordinates, and waypoint progression are 100% deterministic and never hallucinated.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setProvider('deterministic')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              provider === 'deterministic'
                ? 'bg-primary-dim/30 border-primary text-slate-100'
                : 'bg-surface-subtle border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-200">Deterministic Engine</span>
              {provider === 'deterministic' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Curated templates & rule-based themes. 100% offline with zero dependencies.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setProvider('ollama')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              provider === 'ollama'
                ? 'bg-primary-dim/30 border-primary text-slate-100'
                : 'bg-surface-subtle border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-200">Local Ollama Inference</span>
              {provider === 'ollama' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Local open-weight model (Qwen 2.5 1.5B / Llama 3.2) running on your machine.
            </p>
          </button>
        </div>

        {provider === 'ollama' && (
          <div className="space-y-4 pt-2">
            {/* Ollama URL and Model Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Ollama Base URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full text-xs font-mono bg-surface border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Open-Weight Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs font-mono bg-surface border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="qwen2.5:1.5b">qwen2.5:1.5b (Recommended, Apache 2.0, ~1.2GB)</option>
                  <option value="qwen2.5:3b">qwen2.5:3b (Apache 2.0, ~2.2GB)</option>
                  <option value="llama3.2:3b">llama3.2:3b (Llama Community, ~2.0GB)</option>
                  <option value="mistral:7b">mistral:7b (Apache 2.0, ~4.5GB)</option>
                </select>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={isCheckingHealth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleHealthCheck}
                disabled={isCheckingHealth}
              >
                Test Ollama Connection
              </Button>
              {healthStatus && (
                <Badge variant={healthStatus.isAvailable ? 'success' : 'danger'} size="sm">
                  {healthStatus.isAvailable ? 'Ollama Online' : 'Ollama Offline'}
                </Badge>
              )}
            </div>

            {/* Health Result Feedback */}
            {healthStatus && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  healthStatus.isAvailable
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-red-950/60 border-red-800 text-red-200'
                }`}
              >
                {healthStatus.isAvailable ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{healthStatus.details || 'Ollama daemon reachable and ready.'}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Connection failed:</div>
                      <div>{healthStatus.error}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Setup & CLI Instructions Box */}
            <div className="p-3.5 rounded-xl bg-surface-subtle border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-accent" />
                <span>Ollama Quick Setup Guide</span>
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed space-y-1.5 font-mono bg-surface p-2.5 rounded-lg border border-slate-700/80">
                <div># 1. Start your local Ollama server</div>
                <div className="text-primary font-bold">ollama serve</div>
                <div># 2. Pull the lightweight instruction model</div>
                <div className="text-primary font-bold">ollama pull {selectedModel}</div>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                <span>Model License: <strong>Apache 2.0</strong> (Qwen 2.5). Fully local inference with zero data transmission.</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* GPS & Sensor Configuration */}
      <Card variant="default" className="space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-200">Location Sensor & Tolerance</h2>
          </div>
          <Badge variant="success" size="sm" dot>Foreground Active</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Maximum Acceptable GPS Uncertainty
            </label>
            <span className="text-xs font-mono font-bold text-primary">±{gpsAccuracyThreshold} meters</span>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            step="5"
            value={gpsAccuracyThreshold}
            onChange={(e) => setGpsAccuracyThreshold(Number(e.target.value))}
            className="w-full accent-primary bg-slate-700 h-2 rounded-lg cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            GPS readings with horizontal error larger than ±{gpsAccuracyThreshold}m will be treated with caution to avoid premature waypoint triggers in urban canyons.
          </p>
        </div>
      </Card>

      {/* Local Storage & Privacy Controls */}
      <Card variant="subtle" className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">Local Data Storage</h2>
          </div>
          <Badge variant="neutral" size="sm">Local Sandbox</Badge>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Erase active mission snapshots and offline route caches stored in this browser.
        </p>

        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 className="w-4 h-4" />}
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('waypoint_active_mission_snapshot');
              alert('Local navigation snapshot cleared.');
            }
          }}
        >
          Purge Local Storage Snapshot
        </Button>
      </Card>
    </div>
  );
}
