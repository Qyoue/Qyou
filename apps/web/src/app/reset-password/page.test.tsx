import { render, screen } from '@testing-library/react';
import ResetPasswordPage from './page';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('token=abc') }));

describe('ResetPasswordPage', () => {
  it('renders token reset form and strength feedback', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText(/Reset password/i)).toBeInTheDocument();
    expect(screen.getByText(/Strength:/i)).toBeInTheDocument();
  });
});
