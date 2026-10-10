import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '@/app/page';
import MissionsPage from '@/app/missions/page';
import SettingsPage from '@/app/settings/page';

describe('Application Pages', () => {
  describe('HomePage', () => {
    it('renders mission setup form with duration and radius controls', () => {
      render(<HomePage />);
      expect(screen.getByText(/mission.*setup/i)).toBeInTheDocument();
      expect(screen.getByText('Eyes Up, Phone Away')).toBeInTheDocument();
      expect(screen.getByText('Greenway & Nature')).toBeInTheDocument();
      expect(screen.getByText('Architectural & Heritage')).toBeInTheDocument();
      expect(screen.getByText('Urban Discovery')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate waypoint route/i })).toBeInTheDocument();
    });

    it('allows changing exploration style selection', () => {
      render(<HomePage />);
      const heritageBtn = screen.getByText('Architectural & Heritage').closest('button');
      expect(heritageBtn).toBeInTheDocument();
      if (heritageBtn) {
        fireEvent.click(heritageBtn);
      }
      expect(heritageBtn).toHaveClass('border-primary');
    });
  });

  describe('MissionsPage', () => {
    it('renders saved missions empty state and local persistence guarantee', () => {
      render(<MissionsPage />);
      expect(screen.getByText('Saved Missions')).toBeInTheDocument();
      expect(screen.getByText('No Saved Missions Found')).toBeInTheDocument();
      expect(screen.getByText('Local Persistence Guarantee')).toBeInTheDocument();
    });
  });

  describe('SettingsPage', () => {
    it('renders system settings and allows toggling AI providers', () => {
      render(<SettingsPage />);
      expect(screen.getByText('System Settings & Diagnostics')).toBeInTheDocument();
      expect(screen.getByText('Deterministic Provider')).toBeInTheDocument();
      expect(screen.getByText('Local Ollama Inference')).toBeInTheDocument();

      const ollamaBtn = screen.getByText('Local Ollama Inference').closest('button');
      if (ollamaBtn) {
        fireEvent.click(ollamaBtn);
      }
      expect(screen.getByText('Ollama API Base URL')).toBeInTheDocument();
    });
  });
});
