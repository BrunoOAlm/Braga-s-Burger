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

export const revalidate = 300;

export default async function Home() {
  const menu = await getMenu({ revalidate: 300 });
  const { categories, products } = toLegacyMenu(menu);

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Reveal>
          <FeaturedCarousel products={products} />
        </Reveal>
        <Reveal>
          <Gallery />
        </Reveal>
        <Reveal>
          <MenuSection categories={categories} products={products} />
        </Reveal>
        <Reveal>
          <InfoSection />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
