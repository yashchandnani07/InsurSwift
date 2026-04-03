"use client";

import Link from "next/link";
import { Shield, BarChart3, FileText, Zap, Lock } from "lucide-react";
import Icon from '@/components/ui/AppIcon';


export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 50,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2.5rem",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 32, height: 32, background: "#1d4ed8", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em", color: "#0f172a" }}>InsurSwift</span>
        </div>

        {/* Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Link href="#features" style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem", fontWeight: 500, color: "#475569", textDecoration: "none", borderRadius: 6, transition: "color 0.15s" }}>
            Platform
          </Link>
          <Link href="#security" style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem", fontWeight: 500, color: "#475569", textDecoration: "none", borderRadius: 6, transition: "color 0.15s" }}>
            Security
          </Link>
          <Link href="/login" style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem", fontWeight: 500, color: "#475569", textDecoration: "none", borderRadius: 6, marginLeft: "0.5rem" }}>
            Sign In
          </Link>
          <Link href="/login" className="btn-primary" style={{ marginLeft: "0.5rem", borderRadius: 6, textDecoration: "none" }}>
            Launch Dashboard
          </Link>
        </div>
      </nav>
      {/* ── HERO ────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 160,
          paddingBottom: 120,
          paddingLeft: "2.5rem",
          paddingRight: "2.5rem",
          borderBottom: "1px solid #e2e8f0",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 0.75rem",
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            marginBottom: "2rem",
            background: "#f8fafc",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Institutional Grade · v2.4
          </span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: "1.5rem", maxWidth: 700 }}>
          Precision<br />
          <span style={{ color: "#1d4ed8" }}>Claim Automation.</span>
        </h1>

        {/* Sub */}
        <p style={{ fontSize: "1.125rem", color: "#64748b", lineHeight: 1.7, maxWidth: 560, marginBottom: "2.5rem" }}>
          High-fidelity forensic intelligence for motor insurance settlement at scale.
          AI-driven decisions, zero latency, full audit trail.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/login" className="btn-primary" style={{ fontSize: "0.9375rem", padding: "0.875rem 1.75rem", borderRadius: 6, textDecoration: "none" }}>
            Establish Session →
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1.25rem",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              borderRadius: 6,
            }}
          >
            <Lock size={13} style={{ color: "#22c55e" }} />
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>ISO 27001</p>
              <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>Secure · 99.9% uptime</p>
            </div>
          </div>
        </div>
      </section>
      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 2.5rem", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ marginBottom: "3rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Admin Capabilities
          </p>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#0f172a" }}>
            Underwriting Core.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", background: "#e2e8f0", border: "1px solid #e2e8f0" }}>
          {[
            { icon: BarChart3, title: "Institutional Oversight", desc: "Real-time auditing of claim processing velocity across regional hubs." },
            { icon: Shield,    title: "Fraud Core",              desc: "Proprietary ML scoring for evidence verification and forensic analysis." },
            { icon: FileText,  title: "Regulatory Export",       desc: "Standardized manifest generation for legal and financial audit compliance." },
          ]?.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: "#fff",
                padding: "2.5rem 2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                transition: "background 0.15s",
                cursor: "default",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <div style={{ width: 44, height: 44, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#1d4ed8" }}>
                <Icon size={22} />
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h3>
              <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
      {/* ── MOBILE / CLAIMANT ───────────────────────────────── */}
      <section id="security" style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 2.5rem", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          {/* Text side */}
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Claimant Interface
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#0f172a", marginBottom: "2rem" }}>
              Mobile<br /><span style={{ color: "#1d4ed8" }}>First Notice.</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { title: "OCR Extraction",  desc: "Automated RC data ingestion" },
                { title: "Evidence Core",   desc: "Contextual image analysis" },
                { title: "Fraud Flags",     desc: "Incident pattern scoring" },
                { title: "Audit Trail",     desc: "Digital chain of custody" },
              ]?.map(({ title, desc }) => (
                <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d4ed8", marginTop: 7, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</p>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "0.2rem 0 0" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual placeholder */}
          <div style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, height: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
            <Zap size={40} style={{ color: "#1d4ed8" }} />
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", fontWeight: 500, margin: 0 }}>Claims Interface Preview</p>
          </div>
        </div>
      </section>
      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ background: "#0f172a", padding: "6rem 2.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginBottom: "2rem" }}>
          Redefine Your <span style={{ color: "#60a5fa" }}>Claims Speed.</span>
        </h2>
        <Link href="/login" className="btn-primary" style={{ fontSize: "0.9375rem", padding: "0.875rem 2rem", borderRadius: 6, textDecoration: "none", background: "#1d4ed8" }}>
          Join Institutional Network
        </Link>
      </section>
      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: "#fff", borderTop: "1px solid #e2e8f0", padding: "2rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 26, height: 26, background: "#1d4ed8", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>InsurSwift Institutional</span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0 }}>© 2026 InsurSwift Technology Inc.</p>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {["Intelligence", "Security", "Scale"]?.map(s => (
            <span key={s} style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>{s}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
