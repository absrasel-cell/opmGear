import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Cap 101 | OPM Gear — Custom Caps",
  description:
    "Learn how our custom cap process works: styles, fabrics, logos, pricing tiers, and delivery. A quick guide to building your perfect cap.",
};

export default function Cap101Page() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/uploads/home/bg3.webp"
            alt="Custom caps hero background"
            fill
            priority
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/80" />
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
          <div className="max-w-3xl animate-fade-in">
            <span className="inline-block mb-3 px-3 py-1 rounded-full glass-badge text-xs uppercase tracking-widest">Knowledge Base</span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Cap 101
            </h1>
            <p className="mt-4 text-slate-200 max-w-2xl">
              A fast, visual guide to how our custom caps are made, what you can customize, how pricing works, and when you can expect delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/quote-request" className="glass-button-primary px-5 py-3 rounded-full font-semibold text-black">
                Start a Quote
              </Link>
              <Link href="/gallery" className="glass-button px-5 py-3 rounded-full font-semibold">
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl mb-10">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="mt-2 text-slate-300">Six simple steps from idea to delivery.</p>
        </div>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { img: "/uploads/how-it-works/1.png", title: "Choose Style", text: "Pick 6‑panel, 7‑panel, trucker, curved, flat bill, bucket, visor and more." },
            { img: "/uploads/how-it-works/2.png", title: "Select Fabrics", text: "Default Chino Twill or upgrade to suede, leather, acrylic, mesh splits, etc." },
            { img: "/uploads/how-it-works/3.png", title: "Add Your Logos", text: "Embroidery, 3D embroidery, rubber/leather/woven patches, screen or sublimation." },
            { img: "/uploads/how-it-works/4.png", title: "Confirm Details", text: "Profile, structure, closure, stitching, size—your preferences or our defaults." },
            { img: "/uploads/how-it-works/5.png", title: "Approve & Produce", text: "Approve visuals; we manufacture with consistent QA at tiered pricing." },
            { img: "/uploads/how-it-works/6.png", title: "Ship & Deliver", text: "Express parcel for all sizes; air/sea freight options for very large orders." },
          ].map((s, i) => (
            <li key={i} className="glass-card p-5 rounded-2xl border border-white/10">
              <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-white/5">
                {/* Using standard <img> for .png assets */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt="" className="absolute inset-0 h-full w-full object-contain p-3" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-lg">{i + 1}. {s.title}</h3>
                <p className="mt-1 text-slate-300 text-sm">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Customization Options */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl mb-10">
          <h2 className="text-3xl font-bold">Customization Options</h2>
          <p className="mt-2 text-slate-300">Mix and match logos, closures, fabrics and accessories.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { img: "/uploads/Decoration/Embroidery USCC.webp", title: "Embroidery", text: "Crisp, durable stitching. Great for most logos." },
            { img: "/uploads/Decoration/3D Embroidery USCC.webp", title: "3D Embroidery", text: "Raised detail for a premium look." },
            { img: "/uploads/Decoration/Leather Patch.webp", title: "Leather Patch", text: "Elegant, professional branding in multiple sizes." },
            { img: "/uploads/Decoration/Woven Patch USCC.webp", title: "Woven Patch", text: "Fine detail and smooth finish." },
            { img: "/uploads/Decoration/ScreenPrint USCC.webp", title: "Screen Print", text: "Bold, flat colors for graphic logos." },
            { img: "/uploads/Decoration/Sublimated Printing USCC.webp", title: "Sublimation", text: "Full‑color, high‑resolution prints, including under‑bill." },
          ].map((c, i) => (
            <div key={i} className="glass-card p-5 rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-white/5">
                <img src={c.img} alt={c.title} className="absolute inset-0 h-full w-full object-contain p-3" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{c.title}</h3>
              <p className="mt-1 text-slate-300 text-sm">{c.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { img: "/uploads/home/Customization/Closure Optionns.webp", title: "Closures", text: "Snapback (default), strapback, velcro, fitted, buckle, and more." },
            { img: "/uploads/home/Customization/Fabric Options.webp", title: "Fabrics", text: "Default Chino Twill or upgrade to suede cotton, genuine leather, acrylic, mesh." },
            { img: "/uploads/home/Customization/Accessories Options.webp", title: "Accessories", text: "Hang tags, stickers, inside labels, polybags, and custom packaging." },
          ].map((c, i) => (
            <div key={i} className="glass-card p-5 rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-white/5">
                <img src={c.img} alt={c.title} className="absolute inset-0 h-full w-full object-contain p-3" />
              </div>
              <h3 className="mt-4 font-semibold">{c.title}</h3>
              <p className="mt-1 text-slate-300 text-sm">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fabrics & Colors */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl mb-8">
          <h2 className="text-3xl font-bold">Fabrics & Colors</h2>
          <p className="mt-2 text-slate-300">Default and premium fabric choices with broad color availability.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card p-5 rounded-2xl border border-white/10">
            <h3 className="font-semibold">Default Fabric</h3>
            <p className="mt-1 text-slate-300 text-sm">Chino Twill (balanced weight). Split: Chino Twill / Trucker Mesh available.</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-200 list-disc list-inside">
              <li>Construction weights: 16A‑12 (default), 20A‑20 (light), 10A‑10 (heavy)</li>
              <li>Premium upgrades: Suede Cotton, Genuine Leather, Acrylic</li>
              <li>Large orders (2880+): custom fabric dyeing at mills</li>
            </ul>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-white/10">
            <h3 className="font-semibold">Popular Colors</h3>
            <p className="mt-1 text-slate-300 text-sm">We stock a wide range of solid and split colors.</p>
            <div className="mt-3 grid grid-cols-8 gap-2">
              {[
                { name: "Black", className: "bg-black" },
                { name: "White", className: "bg-white" },
                { name: "Navy", className: "bg-blue-900" },
                { name: "Royal", className: "bg-blue-700" },
                { name: "Red", className: "bg-red-600" },
                { name: "Khaki", className: "bg-amber-700" },
                { name: "Grey", className: "bg-gray-500" },
                { name: "Olive", className: "bg-lime-700" },
                { name: "Orange", className: "bg-orange-500" },
                { name: "Gold", className: "bg-yellow-500" },
                { name: "Green", className: "bg-green-600" },
                { name: "Purple", className: "bg-purple-600" },
                { name: "Pink", className: "bg-pink-500" },
                { name: "Camo", className: "bg-[repeating-linear-gradient(45deg,#2f3e2e,#2f3e2e_6px,#556b2f_6px,#556b2f_12px,#3b4b35_12px,#3b4b35_18px)]" },
                { name: "Heather", className: "bg-gray-400" },
                { name: "Charcoal", className: "bg-gray-700" },
              ].map((c, i) => (
                <div key={i} className="group">
                  <div className={`h-8 rounded-md border border-white/10 ${c.className}`} />
                  <div className="mt-1 text-[10px] text-slate-300 text-center">{c.name}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Need a specific split or tri‑color? We support custom panels and color blocking.</p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl mb-8">
          <h2 className="text-3xl font-bold">Pricing & Tiers</h2>
          <p className="mt-2 text-slate-300">Transparent, volume‑based pricing with premium upgrades available.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { tier: "Tier 1", subtitle: "Most Affordable", lines: ["48: $3.6", "144+: $3.0", "576+: $2.9", "1152+: $2.84", "2880+: $2.76"] },
            { tier: "Tier 2", subtitle: "Mid‑Range", lines: ["48: $4.4", "144+: $3.2", "576+: $3.0", "1152+: $2.9", "2880+: $2.8"] },
            { tier: "Tier 3", subtitle: "Premium Quality", lines: ["48: $4.8", "144+: $3.4", "576+: $3.2", "1152+: $2.94", "2880+: $2.88"] },
          ].map((card, i) => (
            <div key={i} className="glass-card p-5 rounded-2xl border border-white/10">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-lg">{card.tier}</h3>
                <span className="text-xs text-slate-300">{card.subtitle}</span>
              </div>
              <ul className="mt-3 text-sm text-slate-200 space-y-1">
                {card.lines.map((l, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span>{l.split(": ")[0]} units</span>
                    <span className="font-semibold">{l.split(": ")[1]}/cap</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">Per‑cap costs exclude optional logos, patches, and accessories.</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="glass-card p-5 rounded-2xl border border-white/10">
            <h3 className="font-semibold">Popular Upgrades</h3>
            <ul className="mt-2 text-sm text-slate-200 space-y-1 list-disc list-inside">
              <li>3D Embroidery: from +$0.10 to +$0.20 per cap</li>
              <li>Rubber/Leather/Woven patches: multiple sizes and price breaks</li>
              <li>Accessories: hang tags, stickers, inside labels, polybags</li>
            </ul>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-white/10">
            <h3 className="font-semibold">Flat Services</h3>
            <ul className="mt-2 text-sm text-slate-200 space-y-1 list-disc list-inside">
              <li>Graphics Design: $50 flat</li>
              <li>Physical Sampling: $150 flat</li>
              <li>Patch Mold (one‑time): Small $40 • Medium $60 • Large $80</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl mb-8">
          <h2 className="text-3xl font-bold">Delivery & Lead Time</h2>
          <p className="mt-2 text-slate-300">Express parcel for all quantities. Freight for very large orders.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Regular Express", desc: "Default for most orders.", details: ["48: $3.00", "144+: $2.30", "6–10 days (UPS)"] },
            { title: "Priority Express", desc: "When you need it faster.", details: ["48: $3.20", "144+: $2.50", "4–6 days (FedEx)"] },
            { title: "Freight (Large)", desc: "3168+ units only.", details: ["Air: 10–20 days", "Sea: 45–60 days", "Significant cost savings"] },
          ].map((d, i) => (
            <div key={i} className="glass-card p-5 rounded-2xl border border-white/10">
              <h3 className="font-semibold text-lg">{d.title}</h3>
              <p className="mt-1 text-slate-300 text-sm">{d.desc}</p>
              <ul className="mt-3 text-sm text-slate-200 space-y-1">
                {d.details.map((x, idx) => (
                  <li key={idx}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-400">Typical total timelines: Regular ~15 working days, Priority ~11 working days, Air Freight ~17–27 working days, Sea Freight ~52–67 working days.</p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl mb-8">
          <h2 className="text-3xl font-bold">FAQ</h2>
          <p className="mt-2 text-slate-300">Quick answers to common questions.</p>
        </div>
        <div className="grid gap-3">
          {[
            {
              q: "What are the default specs if I don’t choose?",
              a: "6‑panel, high profile, structured, snapback closure, slight curved bill, matching stitching, Chino Twill fabric.",
            },
            {
              q: "Which logo method should I pick?",
              a: "Embroidery works for most logos. Choose 3D embroidery for raised effect; pick woven/leather/rubber patches for premium feel; use screen or sublimation for complex, multi‑color graphics.",
            },
            {
              q: "Can I do split fabrics or color blocking?",
              a: "Yes. Chino Twill / Trucker Mesh splits are popular, and we support custom panel colors including tri‑colors.",
            },
            {
              q: "Do you offer samples?",
              a: "Yes. Physical Sampling is available as a flat $150 service.",
            },
            {
              q: "How do I start?",
              a: "Send your logo and preferences in our quick form and we’ll prepare visuals and pricing for approval.",
            },
          ].map((item, i) => (
            <details key={i} className="group glass-card p-5 rounded-2xl border border-white/10 open:glass-card-dark">
              <summary className="cursor-pointer font-medium flex items-center justify-between">
                <span>{item.q}</span>
                <span className="ml-4 text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 text-slate-300 text-sm">{item.a}</div>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/quote-request" className="glass-button-primary px-5 py-3 rounded-full font-semibold text-black">
            Start a Quote
          </Link>
          <Link href="/store" className="glass-button px-5 py-3 rounded-full font-semibold">
            Browse Products
          </Link>
        </div>
      </section>
    </div>
  );
}
