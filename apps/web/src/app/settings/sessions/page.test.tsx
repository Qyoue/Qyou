import { render, screen, waitFor } from '@testing-library/react';
import SessionsPage from './page';

global.fetch = jest.fn().mockRejectedValue(new Error('no api')) as any;

describe('SessionsPage', () => {
  it('renders sessions management UI', async () => {
    render(<SessionsPage />);
    await waitFor(() => expect(screen.getByText(/Active sessions/i)).toBeInTheDocument());
  });
});
