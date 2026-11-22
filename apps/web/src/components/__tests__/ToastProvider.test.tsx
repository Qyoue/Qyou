import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';

function Demo() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Session expired', 'error')}>trigger</button>;
}

describe('ToastProvider', () => {
  it('shows toast messages for errors/session events', () => {
    render(
      <ToastProvider>
        <Demo />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByRole('alert')).toHaveTextContent('Session expired');
  });
});
