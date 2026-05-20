import { NeighborhoodsTable } from './NeighborhoodsTable';

export const metadata = {
  title: "Bairros atendidos — Braga's Burger",
};

export default function BairrosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-paper">
      <h1 className="font-heading text-3xl font-extrabold">Bairros atendidos</h1>
      <p className="mt-2 text-muted">
        Taxa de entrega por bairro. Filtre pra encontrar o seu.
      </p>
      <div className="mt-8">
        <NeighborhoodsTable />
      </div>
    </main>
  );
}
