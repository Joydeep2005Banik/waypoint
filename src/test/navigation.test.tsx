import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppHeader } from '@/components/navigation/AppHeader';
import { AppBottomNav } from '@/components/navigation/AppBottomNav';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Navigation Components', () => {
  describe('AppHeader', () => {
    it('renders application branding and status badges', () => {
      render(<AppHeader />);
      expect(screen.getByText(/waypoint/i)).toBeInTheDocument();
      expect(screen.getByText('AUTOPILOT')).toBeInTheDocument();
      expect(screen.getByText('GPS Standby')).toBeInTheDocument();
      expect(screen.getByText('Local Storage')).toBeInTheDocument();
    });
  });

  describe('AppBottomNav', () => {
    it('renders main navigation links', () => {
      render(<AppBottomNav />);
      expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /missions/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });
  });
});
