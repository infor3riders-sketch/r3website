import { Hero } from "@/components/site/hero";
import { FeatureCards } from "@/components/site/feature-cards";
import { TaglineBand } from "@/components/site/tagline-band";
import { LatestNews, Partners, UpcomingEvents } from "@/components/site/home-sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureCards />
      <TaglineBand />
      <UpcomingEvents />
      <LatestNews />
      <Partners />
    </>
  );
}
