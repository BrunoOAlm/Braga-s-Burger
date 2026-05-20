import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallBanner } from './InstallBanner';

describe('InstallBanner', () => {
  it('aparece quando o evento beforeinstallprompt dispara', () => {
    render(<InstallBanner />);
    expect(screen.queryByText(/instale/i)).not.toBeInTheDocument();
    const evt = new Event('beforeinstallprompt') as Event & { prompt?: () => void };
    evt.preventDefault = () => {};
    evt.prompt = () => {};
    fireEvent(window, evt);
    expect(screen.getByText(/instale/i)).toBeInTheDocument();
  });
});
