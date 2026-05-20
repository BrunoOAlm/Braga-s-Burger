import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentificationStep } from './IdentificationStep';

describe('IdentificationStep', () => {
  it('chama onChange ao digitar nome e telefone', async () => {
    const onChange = vi.fn();
    render(
      <IdentificationStep
        value={{ name: '', phone: '' }}
        onChange={onChange}
        onNext={() => {}}
      />,
    );
    await userEvent.type(screen.getByLabelText(/nome/i), 'Bruno');
    expect(onChange).toHaveBeenCalled();
  });

  it('botão Próximo desabilitado com campos vazios', () => {
    render(
      <IdentificationStep
        value={{ name: '', phone: '' }}
        onChange={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /próximo/i })).toBeDisabled();
  });

  it('botão Próximo habilitado com nome e telefone preenchidos', () => {
    render(
      <IdentificationStep
        value={{ name: 'Bruno', phone: '21999999999' }}
        onChange={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /próximo/i })).toBeEnabled();
  });

  it('chama onNext ao clicar em Próximo', async () => {
    const onNext = vi.fn();
    render(
      <IdentificationStep
        value={{ name: 'Bruno', phone: '21999999999' }}
        onChange={() => {}}
        onNext={onNext}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
