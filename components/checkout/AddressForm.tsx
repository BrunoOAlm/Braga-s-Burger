'use client';

import { useEffect, useState } from 'react';
import { deliveryAreas } from '@/data/delivery';
import type { Address } from '@/lib/types';

interface Props {
  value: Address | null;
  onChange: (a: Address | null) => void;
}

function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function AddressForm({ value, onChange }: Props) {
  const [cep, setCep] = useState(value?.cep ?? '');
  const [street, setStreet] = useState(value?.street ?? '');
  const [number, setNumber] = useState(value?.number ?? '');
  const [neighborhood, setNeighborhood] = useState(value?.neighborhood ?? '');
  const [complement, setComplement] = useState(value?.complement ?? '');
  const [reference, setReference] = useState(value?.reference ?? '');

  // Estado derivado: computado no render, sem useEffect (regra react-hooks/set-state-in-effect)
  const neighborhoodOutOfArea =
    neighborhood !== '' &&
    !deliveryAreas.find(
      (a) => a.neighborhood.toLowerCase() === neighborhood.toLowerCase(),
    );

  // Busca na ViaCEP quando o CEP tem 8 dígitos
  useEffect(() => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
      } catch {
        // silencia — o usuário pode digitar manualmente
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cep]);

  // Propaga para fora sempre que algo muda
  useEffect(() => {
    if (cep && street && number && neighborhood) {
      onChange({
        cep,
        street,
        number,
        neighborhood,
        complement: complement || undefined,
        reference: reference || undefined,
      });
    } else {
      onChange(null);
    }
  }, [cep, street, number, neighborhood, complement, reference, onChange]);

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        CEP
        <input
          type="text"
          inputMode="numeric"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Rua
        <input
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Número
        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Bairro
        <select
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        >
          <option value="">Selecione...</option>
          {deliveryAreas.map((a) => (
            <option key={a.neighborhood} value={a.neighborhood}>
              {a.neighborhood}
            </option>
          ))}
        </select>
      </label>
      {neighborhoodOutOfArea && (
        <p className="text-sm text-faint">
          Bairro não atendido. Veja a lista em{' '}
          <a className="underline" href="/bairros">
            /bairros
          </a>
          .
        </p>
      )}
      <label className="block text-sm">
        Complemento (opcional)
        <input
          type="text"
          value={complement}
          onChange={(e) => setComplement(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        Referência (opcional)
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="mt-1 w-full rounded border border-line bg-ink px-3 py-2 text-paper focus:border-paper focus:outline-none"
        />
      </label>
    </div>
  );
}
