import { render, screen } from '@testing-library/react';
import SettingsPage from './page';

describe('SettingsPage', () => {
  it('renders account settings and deletion UI', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Account settings/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete account/i })).toBeDisabled();
  });
});
