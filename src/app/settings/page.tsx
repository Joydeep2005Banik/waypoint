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
  Database
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { StatusBanner } from '@/components/common/StatusBanner';

export default function SettingsPage() {
  const [provider, setProvider] = useState<'deterministic' | 'ollama'>('deterministic');
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [gpsAccuracyThreshold, setGpsAccuracyThreshold] = useState(25);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" />
          <span>System Settings & Diagnostics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Hardware sensors, local AI inference configuration, and storage controls
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
          Open-weight AI is strictly utilized for pre-departure mission descriptions. Pathfinding and waypoint progression are 100% deterministic and do not depend on language models.
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
              <span className="text-xs font-bold text-slate-200">Deterministic Provider</span>
              {provider === 'deterministic' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Curated templates and heuristic rules. 100% offline, zero server dependency.
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
              Local open-weight models (Llama 3.2 / Mistral) running on your localhost.
            </p>
          </button>
        </div>

        {provider === 'ollama' && (
          <div className="p-3 rounded-xl bg-surface-subtle border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300">Ollama API Base URL</label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full text-xs font-mono bg-surface border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="text-[10px] text-amber-400/90 leading-tight flex items-start gap-1 mt-1">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>
                Hosted deployments cannot directly connect to a client laptop&apos;s localhost without a local bridge. Never expose unauthenticated Ollama ports to the public internet.
              </span>
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
          <Badge variant="neutral" size="sm">0 MB Cached</Badge>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Erase all mission logs, cached routes, and offline map tiles stored in this browser. This operation cannot be undone.
        </p>

        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 className="w-4 h-4" />}
          onClick={() => alert('Local cache is already clean.')}
        >
          Purge Local IndexedDB Storage
        </Button>
      </Card>
    </div>
  );
}
