import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/hero/HeroSection';
import { FeaturedCarousel } from '@/components/sections/FeaturedCarousel';
import { Gallery } from '@/components/sections/Gallery';
import { MenuSection } from '@/components/sections/MenuSection';
import { InfoSection } from '@/components/sections/InfoSection';
import { Reveal } from '@/components/ui/Reveal';
import { getMenu } from '@/lib/menu-api';
import { toLegacyMenu } from '@/lib/menu-adapter';
import type { Category, Product } from '@/lib/types';

export const revalidate = 300;

export default async function Home() {
  // Se /menu falhar (cold ISR + backend down, brownout, etc.) ainda
  // renderiza marketing (Hero, Gallery, InfoSection). Só esconde
  // FeaturedCarousel e MenuSection enquanto o cardápio não carregar.
  let categories: Category[] = [];
  let products: Product[] = [];
  try {
    const menu = await getMenu({ revalidate: 300 });
    ({ categories, products } = toLegacyMenu(menu));
  } catch {
    // intencional: degrade gracioso
  }

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        {products.length > 0 && (
          <Reveal>
            <FeaturedCarousel products={products} />
          </Reveal>
        )}
        <Reveal>
          <Gallery />
        </Reveal>
        {categories.length > 0 && (
          <Reveal>
            <MenuSection categories={categories} products={products} />
          </Reveal>
        )}
        <Reveal>
          <InfoSection />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
