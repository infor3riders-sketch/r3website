import { Hero } from "@/components/site/hero";
import { FeatureCards } from "@/components/site/feature-cards";
import { MembershipStats } from "@/components/site/membership-stats";
import { TaglineBand } from "@/components/site/tagline-band";
import { LatestNews, Partners, UpcomingEvents } from "@/components/site/home-sections";

export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureCards />
      <TaglineBand />
      <MembershipStats heading="Riders Across Iloilo" />
      <UpcomingEvents />
      <LatestNews />
      <Partners />
    </>
  );
}

