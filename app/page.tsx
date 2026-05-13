import Image from "next/image";
import {
  Armchair,
  Bus,
  Clock,
  Headphones,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#contact", label: "Contact" },
] as const;

const trustPoints = [
  { title: "Online seat reservation", detail: "Pick your seat before you reach the park." },
  { title: "Live bus tracking", detail: "See movement along the corridor in near real time." },
  { title: "Faster support response", detail: "Route issues, delays, and changes in one thread." },
  { title: "Cloud-based access", detail: "Check trips and tickets from any connected device." },
] as const;

const features = [
  {
    icon: Search,
    title: "Online Trip Search",
    description:
      "Compare Bamenda departures by time, operator, and destination so passengers can plan around lectures, markets, and family travel.",
  },
  {
    icon: Armchair,
    title: "Seat Reservation",
    description:
      "Hold a specific seat on busy corridors, reduce crowding at counters, and give agencies a clearer picture of load before departure.",
  },
  {
    icon: Navigation,
    title: "Live Bus Tracking",
    description:
      "GPS-backed positions help travelers and families see where the coach is along the ring road and inter-urban stretches.",
  },
  {
    icon: Clock,
    title: "ETA Updates",
    description:
      "Refresh estimates when traffic, weather, or stops shift reality so riders can adjust pickup plans without endless phone calls.",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description:
      "In-app messaging ties tickets, routes, and trip context together so staff can answer clearly when plans change mid-journey.",
  },
  {
    icon: ShieldCheck,
    title: "Admin Monitoring",
    description:
      "Operators get a calm dashboard view of departures, occupancy signals, and support queues without building custom IT stacks.",
  },
] as const;

const steps = [
  {
    step: "01",
    title: "Search route",
    body: "Enter Bamenda and your destination, then scan departures that match your day.",
  },
  {
    step: "02",
    title: "Reserve seat",
    body: "Choose a seat, confirm fare details, and keep a digital record for boarding.",
  },
  {
    step: "03",
    title: "Track bus live",
    body: "Follow progress on the map and watch ETAs adjust as the coach moves.",
  },
  {
    step: "04",
    title: "Get support when needed",
    body: "Open a support thread tied to your ticket if delays, stops, or luggage questions come up.",
  },
] as const;

const passengerBenefits = [
  "Less time guessing which agency still has seats on peak travel days.",
  "Clearer expectations when ring-road traffic or stops add delay minutes.",
  "A single place for ticket proof, route notes, and support replies.",
  "Easier coordination for students and families meeting coaches roadside.",
] as const;

const operatorBenefits = [
  "Better visibility into seat uptake before dispatch teams finalize manifests.",
  "Fewer repetitive phone calls when ETAs can be read directly in the app.",
  "Support staff see trip context instead of piecing together WhatsApp threads.",
  "Cloud access keeps counter teams and supervisors aligned on the same day sheet.",
] as const;

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center motion-safe:animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">{subtitle}</p>
    </div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900 transition hover:text-teal-800 sm:text-lg"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm shadow-teal-700/20">
            <Bus className="h-5 w-5" aria-hidden />
          </span>
          <span className="leading-snug">MyBus</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#demo-preview"
            className="hidden rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-700/25 transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:inline-flex"
          >
            View Demo
          </a>

          <details className="relative lg:hidden">
            <summary className="list-none cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-800 [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-900"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#demo-preview"
                className="mt-1 block rounded-lg bg-teal-700 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                View Demo
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function HeroPreview() {
  return (
    <div id="demo-preview" className="relative scroll-mt-28">
      <div
        className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-teal-100/70 blur-3xl motion-safe:animate-fade-up motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="absolute -bottom-10 -right-4 h-44 w-44 rounded-full bg-amber-100/60 blur-3xl motion-safe:animate-fade-up-delayed motion-reduce:animate-none"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 motion-safe:animate-fade-up-delayed-2 motion-reduce:animate-none motion-reduce:opacity-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Trip route</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Bamenda → Yaoundé</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-teal-700" aria-hidden />
              Nkwen motor park · Today · 06:30
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            Live on route
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seat booking</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {["A1", "A2", "A3", "A4"].map((seat, idx) => (
                <div
                  key={seat}
                  className={`flex h-10 items-center justify-center rounded-lg text-xs font-semibold ${
                    idx === 1
                      ? "border-2 border-amber-400 bg-amber-50 text-amber-900"
                      : "border border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {seat}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">A2 held · Pay at counter or mobile money (demo)</p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Support</p>
              <p className="mt-2 text-sm font-medium text-slate-900">“Is the 06:30 coach still loading?”</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Agent: Yes—extra stop near Fundong. New ETA +18 min. Your seat stays reserved.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-teal-800">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Typical response under 5 min (target)
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Updated 2 min ago
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden />
            Preview UI — not live data
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div id="top">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.12),_transparent_55%)]" aria-hidden />

          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
            <div className="motion-safe:animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden />
                Built for Bamenda Inter-Urban Transport
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Easier bus travel from Bamenda, with booking, live tracking, and support in one flow.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">MyBus</span> is a cloud-based travel booking system for
                inter-urban coaches—helping passengers search trips, reserve seats, follow buses live, and reach support
                without losing context.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-teal-700/25 transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Explore Features
                </a>
                <a
                  href="#project-overview"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  See Project Overview
                </a>
              </div>

              <dl className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Corridor focus</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">Bamenda ↔ major cities</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Designed for</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">Passengers & agencies</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">v1 landing concept</dd>
                </div>
              </dl>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-slate-200 bg-white py-10" aria-label="Highlights">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {trustPoints.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-100 hover:shadow-md motion-reduce:transition-none"
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Product surface"
              title="Everything riders expect from a serious travel app—without the noise."
              subtitle="Six focused capabilities that mirror how Bamenda travelers actually plan: quick search, clear seats, honest ETAs, and support that remembers the ticket."
            />

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-teal-100 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700/10 text-teal-800 ring-1 ring-teal-700/10 transition group-hover:bg-teal-700 group-hover:text-white group-hover:ring-teal-700 motion-reduce:transition-none">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 border-y border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Flow"
              title="From search to support—four calm steps."
              subtitle="The journey is linear on purpose: each step hands the next one better context, which matters when coaches leave early or roads slow unexpectedly."
            />

            <ol className="relative mt-16 grid gap-8 lg:grid-cols-4">
              <div
                className="pointer-events-none absolute left-4 top-10 hidden h-0.5 w-[calc(100%-2rem)] bg-gradient-to-r from-teal-200 via-teal-100 to-amber-100 lg:block"
                aria-hidden
              />
              {steps.map((item, index) => (
                <li key={item.step} className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm transition hover:border-teal-100 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white shadow-sm shadow-teal-700/30">
                      {item.step}
                    </span>
                    {index < steps.length - 1 && (
                      <span className="hidden text-xs font-semibold uppercase tracking-wide text-slate-400 lg:inline">
                        Next
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="scroll-mt-24 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Impact"
              title="Built for Bamenda realities—passengers first, operators supported."
              subtitle="Inter-urban travel here mixes fixed schedules with flexible roadside culture. MyBus keeps both sides aligned without promising magic fixes to traffic or weather."
            />

            <div className="mt-14 grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700/10 text-teal-800">
                    <Bus className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Passenger benefits</h3>
                    <p className="text-sm text-slate-500">Travelers leaving from Bamenda and surrounding pickups</p>
                  </div>
                </div>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                  {passengerBenefits.map((line) => (
                    <li key={line} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/5 text-slate-800">
                    <ShieldCheck className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Operator benefits</h3>
                    <p className="text-sm text-slate-500">Agencies running scheduled inter-urban services</p>
                  </div>
                </div>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                  {operatorBenefits.map((line) => (
                    <li key={line} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-5">
                <div className="relative min-h-[220px] bg-slate-900 lg:col-span-2">
                  <Image
                    src="/images/Bamenda.jpg"
                    alt="Amour Mezam Park — Bamenda inter-urban motor park."
                    fill
                    className="object-cover opacity-80"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white">
                    Amour Mezam Park — Popular Bamenda inter-urban motor park.
                  </p>
                </div>
                <div className="flex flex-col justify-center p-8 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Field note</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">Why this matters around Bamenda</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Peak travel days, semester breaks, and market mornings stress both parks and passengers. Clear seat
                    signals, honest ETAs, and support tied to the ticket reduce friction without replacing the human work
                    agencies already do well.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Project overview */}
        <section id="project-overview" className="scroll-mt-24 border-t border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Project overview"
              title="Academic framing for evaluators and collaborators."
              subtitle="This section summarizes intent, scope, and what is intentionally out of scope for the v1 landing experience."
            />

            <div className="mt-12 space-y-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-8 text-sm leading-relaxed text-slate-700 shadow-inner sm:text-base">
              <p>
                <strong className="font-semibold text-slate-900">MyBus</strong> explores a cloud-based travel booking
                platform for inter-urban bus transportation centered on Bamenda. The concept couples online trip
                discovery and seat reservation with{" "}
                <strong className="font-semibold text-slate-900">live bus tracking via GPS</strong> and{" "}
                <strong className="font-semibold text-slate-900">integrated customer support</strong> so travelers,
                families, and operators share the same operational picture during the journey—not only at departure.
              </p>
              <p>
                The production system would connect scheduling, ticketing, telemetry, and messaging services in the
                cloud. This repository milestone is deliberately narrower:{" "}
                <strong className="font-semibold text-slate-900">
                  a v1 frontend landing page that communicates the product story for academic and demo review
                </strong>
                . No authentication flows, booking transactions, admin consoles, or live integrations are implied by this
                page.
              </p>
              <p>
                Evaluators should read the surface as a credible transport-tech concept grounded in Bamenda inter-urban
                realities—clear information design, restrained visuals, and copy that respects how coaches actually run.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="demo-cta" className="scroll-mt-24 bg-gradient-to-b from-teal-900 via-teal-800 to-slate-900 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-100">Next step</p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Continue to the prototype when you are ready.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-teal-50 sm:text-lg">
              This landing page sets context for MyBus. The interactive demo (when published) will show flows for trip
              search, seat selection, live tracking, and support—still front-end first, with backend work scoped separately.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#demo-preview"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-900 shadow-lg shadow-black/10 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-900"
              >
                Open Demo Preview
              </a>
              <a
                href="#project-overview"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-900"
              >
                Re-read overview
              </a>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-24 bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Contact</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Questions about the build or demo?</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                For academic review, share feedback on clarity, accessibility, and whether the story matches Bamenda
                inter-urban travel. This section is informational—no form submission is wired in the v1 landing scope.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <dl className="space-y-4 text-sm text-slate-700">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</dt>
                  <dd className="mt-1 font-semibold text-slate-900">MyBus — Bamenda Transit Cloud</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Milestone</dt>
                  <dd className="mt-1">Landing page v1 (frontend concept)</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</dt>
                  <dd className="mt-1">Passengers, agencies, and university evaluators</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-900">MyBus</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600">
              Final-year project concept: cloud booking, live tracking, and customer support for Bamenda inter-urban
              transportation—presented here as a focused landing experience.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600" aria-label="Footer">
            <a className="transition hover:text-teal-800" href="#features">
              Features
            </a>
            <a className="transition hover:text-teal-800" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-teal-800" href="#benefits">
              Benefits
            </a>
            <a className="transition hover:text-teal-800" href="#project-overview">
              Overview
            </a>
            <a className="transition hover:text-teal-800" href="#demo-cta">
              Demo
            </a>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} MyBus / Bamenda Transit Cloud — demonstration UI only.
        </p>
      </footer>
    </div>
  );
}
