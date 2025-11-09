import { BenefitsSection } from '~/components/landing/benefits-section'
import { Footer } from '~/components/landing/footer'
import { HeroSection } from '~/components/landing/hero-section'
import { HowItWorksSection } from '~/components/landing/how-it-works-section'
import { StatsSection } from '~/components/landing/stats-section'
import { TestimonialsSection } from '~/components/landing/testimonials-section'

export default async function HomePage() {
	return (
		<main className="min-h-screen">
			<HeroSection />
			<BenefitsSection />
			<HowItWorksSection />
			<StatsSection />
			<TestimonialsSection />
			<Footer />
		</main>
	)
}
