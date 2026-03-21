// ─── About Page ──────────────────────────────────────────────────

import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Code2, Target, Heart } from 'lucide-react';

export const metadata: Metadata = {
  ...createMetadata({
    title: 'About JobAgg — Created by Ahmed Tawfik',
    description:
      'Learn about JobAgg and its creator. Discover the mission behind aggregating job listings from 15+ sources to make job searching easier.',
    path: '/about',
  }),
};

const FEATURES = [
  {
    icon: Code2,
    title: 'Built with Modern Tech',
    description:
      'JobAgg is built using cutting-edge technologies including TypeScript, React, Next.js, and more to ensure performance and reliability.',
  },
  {
    icon: Target,
    title: 'Mission-Driven',
    description:
      'We believe job searching should be simple and efficient. Our goal is to save you hours by aggregating jobs from multiple platforms in one place.',
  },
  {
    icon: Heart,
    title: 'User-Focused',
    description:
      'Every feature is designed with you in mind. We continuously improve based on feedback to make job searching better.',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32 bg-muted/10">
        <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
          <div className="h-[50rem] w-[50rem] rounded-full bg-primary/5 opacity-50 blur-3xl mix-blend-multiply" />
        </div>

        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              About <span className="text-primary">JobAgg</span>
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
              Making job searching faster and easier, one aggregation at a time.
            </p>
          </div>
        </Container>
      </section>

      {/* Creator Section */}
      <section className="py-24 sm:py-32">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 md:grid-cols-2 items-center mb-20">
              <div>
                <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-6">
                  Created by Ahmed Tawfik
                </h2>
                <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                  Ahmed is a passionate full-stack developer dedicated to solving real-world
                  problems through technology. With a background in software development, he created
                  JobAgg to streamline the job search process.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  JobAgg was born from a simple observation: job seekers spend too much time jumping
                  between different job boards. Ahmed envisioned a platform that aggregates the best
                  opportunities from 15+ sources, making the search process faster, smarter, and
                  more efficient.
                </p>
                <div className="flex items-center gap-4">
                  <a
                    href="mailto:ahmedtawfik833@gmail.com"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    <Mail className="h-5 w-5" />
                    <span className="text-sm font-medium">Get in touch</span>
                  </a>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-primary/20 to-primary/5   flex items-center justify-center border border-primary/10">
                  <div className="text-center">
                    <Code2 className="h-16 w-16 text-primary/60 mx-auto mb-4" />
                    <p className="text-sm font-medium text-foreground">Ahmed Tawfik</p>
                    <p className="text-xs text-muted-foreground">Full Stack Developer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-muted/10">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">
                What Makes JobAgg Different
              </h2>
              <p className="text-lg text-muted-foreground">
                We're committed to providing the best job search experience
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="bg-card hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Icon className="h-8 w-8 text-primary mb-2" />
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* Mission Section */}
      <section className="py-24 sm:py-32">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-6">
              Our Mission
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground mb-8">
              JobAgg exists to democratize job searching. We believe that finding the right
              opportunity should be simple, transparent, and efficient. By aggregating listings from
              top job boards and providing powerful filtering tools, we're helping thousands of job
              seekers find their next opportunity faster.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Whether you're looking for your first job, making a career change, or seeking remote
              opportunities, JobAgg is here to help you succeed.
            </p>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-r from-primary/5 to-primary/10">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-6">
              Ready to find your next opportunity?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start browsing jobs from 15+ sources today. It's completely free to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/jobs"
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Browse Jobs
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-primary/20 text-foreground font-semibold hover:bg-muted transition-colors"
              >
                View Pricing
              </a>
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </main>
  );
}
