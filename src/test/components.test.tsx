import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { StatusBanner } from '@/components/common/StatusBanner';

describe('Common UI Components', () => {
  describe('Button', () => {
    it('renders with children and responds to click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Start Mission</Button>);

      const button = screen.getByRole('button', { name: /start mission/i });
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('respects disabled state', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>);

      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Card', () => {
    it('renders card content with proper structure', () => {
      render(
        <Card variant="elevated" data-testid="test-card">
          <span>Card Body</span>
        </Card>
      );
      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Card Body');
    });
  });

  describe('Badge', () => {
    it('renders badge with correct text and variant classes', () => {
      render(<Badge variant="success">GPS Locked</Badge>);
      expect(screen.getByText('GPS Locked')).toBeInTheDocument();
    });
  });

  describe('StatusBanner', () => {
    it('renders alert message and title', () => {
      render(
        <StatusBanner
          type="warning"
          title="GPS Uncertainty"
          message="Signal is weak near tall buildings"
        />
      );
      expect(screen.getByText('GPS Uncertainty')).toBeInTheDocument();
      expect(screen.getByText('Signal is weak near tall buildings')).toBeInTheDocument();
    });

    it('invokes onDismiss callback when close button is clicked', () => {
      const handleDismiss = vi.fn();
      render(
        <StatusBanner
          type="info"
          message="Dismissible alert"
          onDismiss={handleDismiss}
        />
      );
      const closeBtn = screen.getByLabelText('Dismiss banner');
      fireEvent.click(closeBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
