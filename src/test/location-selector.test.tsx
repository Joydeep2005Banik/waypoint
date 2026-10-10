import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationSelector } from '@/components/route/LocationSelector';

describe('LocationSelector Component', () => {
  const mockOnLocationChange = vi.fn();

  beforeEach(() => {
    mockOnLocationChange.mockClear();
  });

  it('renders initial state with Use Current GPS and Search buttons', () => {
    render(
      <LocationSelector
        selectedLocation={null}
        locationName=""
        onLocationChange={mockOnLocationChange}
      />
    );

    expect(screen.getByRole('button', { name: /use current gps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search address/i })).toBeInTheDocument();
  });

  it('handles geolocation permission denied gracefully with a helpful error message', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success, error) => {
        error({
          code: 1, // PERMISSION_DENIED
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      }),
    };

    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });

    render(
      <LocationSelector
        selectedLocation={null}
        locationName=""
        onLocationChange={mockOnLocationChange}
      />
    );

    const gpsBtn = screen.getByRole('button', { name: /use current gps/i });
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(screen.getByText(/location permission was denied/i)).toBeInTheDocument();
    });
  });

  it('displays selected location and coordinates when anchor is set', () => {
    render(
      <LocationSelector
        selectedLocation={{ latitude: 51.5074, longitude: -0.1278 }}
        locationName="Trafalgar Square"
        onLocationChange={mockOnLocationChange}
      />
    );

    expect(screen.getByText('Trafalgar Square')).toBeInTheDocument();
    expect(screen.getByText(/51.50740, -0.12780/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument();
  });
});
