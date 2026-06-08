import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} labelledBy="t">x</Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders dialog with aria-labelledby when open', () => {
    render(
      <Modal open onClose={vi.fn()} labelledBy="t">
        <h2 id="t">Título</h2>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 't');
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} labelledBy="t"><h2 id="t">x</h2></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on overlay click', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} labelledBy="t"><h2 id="t">x</h2></Modal>);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on overlay when closeOnOverlay=false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} labelledBy="t" closeOnOverlay={false}>
        <h2 id="t">x</h2>
      </Modal>
    );
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
