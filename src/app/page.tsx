import { BenefitsSection } from '~/components/landing/benefits-section'
import { Footer } from '~/components/landing/footer'
import { HeroSection } from '~/components/landing/hero-section'
import { HowItWorksSection } from '~/components/landing/how-it-works-section'
import { StatsSection } from '~/components/landing/stats-section'
import { TestimonialsSection } from '~/components/landing/testimonials-section'
import { redirectToUserStep } from '~/lib/user-flow'

export default async function HomePage() {
	// Check if user should be redirected to a different screen
	await redirectToUserStep('/')

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
