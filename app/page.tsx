import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/hero/HeroSection';
import { FeaturedCarousel } from '@/components/sections/FeaturedCarousel';
import { Gallery } from '@/components/sections/Gallery';
import { MenuSection } from '@/components/sections/MenuSection';
import { InfoSection } from '@/components/sections/InfoSection';
import { Reveal } from '@/components/ui/Reveal';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Reveal>
          <FeaturedCarousel />
        </Reveal>
        <Reveal>
          <Gallery />
        </Reveal>
        <Reveal>
          <MenuSection />
        </Reveal>
        <Reveal>
          <InfoSection />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
