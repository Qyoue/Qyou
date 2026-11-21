import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OperatorQueueForm } from '../OperatorQueueForm';

jest.mock('../../lib/api-client', () => ({
  postJson: jest.fn(),
  putJson: jest.fn(),
}));

import { postJson } from '../../lib/api-client';

describe('OperatorQueueForm (#1300)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates with shared schema and shows errors', async () => {
    render(<OperatorQueueForm />);
    fireEvent.click(screen.getByRole('button', { name: /create queue/i }));
    expect(await screen.findByText(/Name must be at least 3 characters/i)).toBeInTheDocument();
    expect(postJson).not.toHaveBeenCalled();
  });

  it('performs optimistic create and rolls back on failure', async () => {
    (postJson as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const onOptimistic = jest.fn();
    const onRollback = jest.fn();

    render(<OperatorQueueForm onOptimistic={onOptimistic} onRollback={onRollback} />);

    fireEvent.change(screen.getByLabelText(/Queue name/i), { target: { value: 'Main Desk' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'bank' } });
    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: '6.5' } });
    fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: '3.3' } });
    fireEvent.click(screen.getByRole('button', { name: /create queue/i }));

    await waitFor(() => expect(onOptimistic).toHaveBeenCalled());
    expect(onOptimistic.mock.calls[0][1]).toBe('create');
    await waitFor(() => expect(onRollback).toHaveBeenCalledWith(null, 'create'));
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});
