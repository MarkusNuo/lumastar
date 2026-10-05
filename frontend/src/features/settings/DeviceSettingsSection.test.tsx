import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_PREFERENCES_KEY, useDevicePreferences } from '../../lib/effects/devicePreferences';
import { HAPTIC_PATTERNS } from '../../lib/effects/haptics';
import { soundPlayer } from '../../lib/effects/soundPlayer';
import { DeviceSettingsSection } from './DeviceSettingsSection';

function stubVibrate() {
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
  return vibrate;
}

beforeEach(() => {
  useDevicePreferences.setState({ sound: true, haptics: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
  localStorage.clear();
});

describe('DeviceSettingsSection', () => {
  it('groups the device settings under "Einstellungen" and mentions the daily goal', () => {
    render(<DeviceSettingsSection />);

    expect(screen.getByRole('region', { name: 'Einstellungen' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Töne' })).toBeChecked();
    expect(screen.getByText(/Tagesziel/)).toBeInTheDocument();
  });

  it('switches the sounds off and remembers it on this device', async () => {
    const user = userEvent.setup();
    render(<DeviceSettingsSection />);

    await user.click(screen.getByRole('switch', { name: 'Töne' }));

    expect(screen.getByRole('switch', { name: 'Töne' })).not.toBeChecked();
    expect(useDevicePreferences.getState().sound).toBe(false);
    expect(localStorage.getItem(DEVICE_PREFERENCES_KEY)).toContain('"sound":false');
  });

  it('plays a sample when the sounds are switched back on', async () => {
    const play = vi.spyOn(soundPlayer, 'play').mockImplementation(() => undefined);
    useDevicePreferences.setState({ sound: false });
    const user = userEvent.setup();
    render(<DeviceSettingsSection />);

    await user.click(screen.getByRole('switch', { name: 'Töne' }));

    expect(play).toHaveBeenCalledWith('correct');
    expect(useDevicePreferences.getState().sound).toBe(true);
  });

  it('hides "Vibration" where the device cannot vibrate', () => {
    render(<DeviceSettingsSection />);

    expect(screen.queryByRole('switch', { name: 'Vibration' })).not.toBeInTheDocument();
  });

  it('offers "Vibration" where the device can vibrate and buzzes once when switched on', async () => {
    const vibrate = stubVibrate();
    useDevicePreferences.setState({ haptics: false });
    const user = userEvent.setup();
    render(<DeviceSettingsSection />);

    const toggle = screen.getByRole('switch', { name: 'Vibration' });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.correct);
  });
});
