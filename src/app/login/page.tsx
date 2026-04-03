"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, User, ChevronRight, Eye, EyeOff, Building2, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type LoginMode = "select" | "admin" | "claimant";

const DEMO_ADMIN = { email: "admin@insureswift.com", password: "Admin@123" };
const DEMO_CLAIMANT = { email: "rahul@example.com", password: "Rahul@123" };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("select");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const autofill = (type: "admin" | "claimant") => {
    const creds = type === "admin" ? DEMO_ADMIN : DEMO_CLAIMANT;
    setEmail(creds.email);
    setPassword(creds.password);
    setError("");
  };

  const seedDemo = async () => {
    setSeedingDemo(true);
    setSeedMsg("");
    try {
      const res = await fetch("/api/seed-demo");
      const json = await res.json();
      if (res.ok) {
        setSeedMsg("✅ Demo accounts ready! You can now log in.");
      } else {
        setSeedMsg(`⚠️ ${json.error || "Seed failed — check service role key."}`);
      }
    } catch {
      setSeedMsg("⚠️ Could not reach seed endpoint.");
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("invalid login credentials") ||
            signInError.message.toLowerCase().includes("invalid credentials")) {
          setError("Invalid credentials. Use the ⚡ Setup Demo button below if this is your first time.");
        } else if (signInError.message.toLowerCase().includes("email not confirmed")) {
          setError("Email not confirmed. Please check your inbox or use the seed endpoint.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      const user = data?.user;
      if (!user) {
        setError("Login failed — no user returned.");
        setLoading(false);
        return;
      }

      // Determine role from metadata, app_metadata, or profile table
      let role = user.user_metadata?.role || user.app_metadata?.role;

      if (!role) {
        // Fallback: look up profile table
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role || "claimant";
      }

      if (mode === "admin" && role !== "admin") {
        setError("This account does not have admin access.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      router.push(role === "admin" ? "/admin-dashboard" : "/claimant-dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Demo Banner */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0.75rem 1.5rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#fbbf24", fontWeight: 700, fontSize: "0.8125rem", flexShrink: 0 }}>
            <Zap size={14} />
            DEMO CREDENTIALS
          </div>

          {/* Admin card */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "0.4rem 0.75rem", flex: 1, minWidth: 260 }}>
            <Building2 size={13} color="#60a5fa" />
            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Admin:</span>
            <code style={{ color: "#f1f5f9", fontSize: "0.75rem" }}>admin@insureswift.com</code>
            <span style={{ color: "#475569", fontSize: "0.75rem" }}>/</span>
            <code style={{ color: "#f1f5f9", fontSize: "0.75rem" }}>Admin@123</code>
            <button onClick={() => { setMode("admin"); autofill("admin"); }} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.6rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 4, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
              <Zap size={10} /> Use
            </button>
          </div>

          {/* Claimant card */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "0.4rem 0.75rem", flex: 1, minWidth: 260 }}>
            <User size={13} color="#34d399" />
            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Claimant:</span>
            <code style={{ color: "#f1f5f9", fontSize: "0.75rem" }}>rahul@example.com</code>
            <span style={{ color: "#475569", fontSize: "0.75rem" }}>/</span>
            <code style={{ color: "#f1f5f9", fontSize: "0.75rem" }}>Rahul@123</code>
            <button onClick={() => { setMode("claimant"); autofill("claimant"); }} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.6rem", background: "#059669", color: "#fff", border: "none", borderRadius: 4, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
              <Zap size={10} /> Use
            </button>
          </div>

          {/* Seed button */}
          <button onClick={seedDemo} disabled={seedingDemo} style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.35rem 0.75rem", background: seedingDemo ? "#374151" : "#7c3aed", color: "#fff", border: "none", borderRadius: 4, fontSize: "0.7rem", fontWeight: 600, cursor: seedingDemo ? "not-allowed" : "pointer", flexShrink: 0 }}>
            <RefreshCw size={11} className={seedingDemo ? "animate-spin" : ""} />
            {seedingDemo ? "Setting up…" : "⚡ Setup Demo"}
          </button>
        </div>
        {seedMsg && (
          <div style={{ maxWidth: 900, margin: "0.5rem auto 0", fontSize: "0.75rem", color: seedMsg.startsWith("✅") ? "#34d399" : "#fbbf24" }}>
            {seedMsg}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: "2rem 1rem" }}>
        {mode === "select" ? (
          <div style={{ width: "100%", maxWidth: 480 }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <Shield size={28} color="#fff" />
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>InsureSwift</h1>
              <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "0.9375rem" }}>AI-Powered Insurance Claims Platform</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button onClick={() => { setMode("admin"); setError(""); }} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.5rem", background: "#fff", border: "2px solid #e2e8f0", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }} onMouseEnter={e => (e.currentTarget.style.borderColor = "#1d4ed8")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Building2 size={22} color="#1d4ed8" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: "#0f172a", margin: 0, fontSize: "0.9375rem" }}>LIC Admin / Agent</p>
                  <p style={{ color: "#64748b", margin: "0.2rem 0 0", fontSize: "0.8125rem" }}>Manage claims, policies, escalations</p>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </button>

              <button onClick={() => { setMode("claimant"); setError(""); }} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.5rem", background: "#fff", border: "2px solid #e2e8f0", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s" }} onMouseEnter={e => (e.currentTarget.style.borderColor = "#059669")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User size={22} color="#059669" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: "#0f172a", margin: 0, fontSize: "0.9375rem" }}>Claimant / Policyholder</p>
                  <p style={{ color: "#64748b", margin: "0.2rem 0 0", fontSize: "0.8125rem" }}>File claims, track status, view policies</p>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </button>
            </div>

            <p style={{ textAlign: "center", marginTop: "1.5rem", color: "#64748b", fontSize: "0.875rem" }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>Sign up</Link>
            </p>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 420 }}>
            <button onClick={() => { setMode("select"); setError(""); }} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", marginBottom: "1.5rem", padding: 0 }}>
              ← Back
            </button>

            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: mode === "admin" ? "#eff6ff" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {mode === "admin" ? <Building2 size={20} color="#1d4ed8" /> : <User size={20} color="#059669" />}
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, color: "#0f172a", margin: 0, fontSize: "1.125rem" }}>
                    {mode === "admin" ? "Admin Login" : "Claimant Login"}
                  </h2>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "0.8125rem" }}>
                    {mode === "admin" ? "LIC Agent / Administrator" : "Policyholder Portal"}
                  </p>
                </div>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: "1rem" }}>
                  <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: "#dc2626", fontSize: "0.8125rem", margin: 0 }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", marginBottom: "0.375rem" }}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={mode === "admin" ? "admin@insureswift.com" : "rahul@example.com"}
                    required
                    style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", marginBottom: "0.375rem" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ width: "100%", padding: "0.625rem 2.5rem 0.625rem 0.875rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: "0.75rem", background: loading ? "#93c5fd" : (mode === "admin" ? "#1d4ed8" : "#059669"), color: "#fff", border: "none", borderRadius: 8, fontSize: "0.9375rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: "0.25rem" }}
                >
                  {loading ? "Signing in…" : `Sign in as ${mode === "admin" ? "Admin" : "Claimant"}`}
                </button>
              </form>

              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button onClick={() => autofill(mode as "admin" | "claimant")} style={{ flex: 1, padding: "0.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.75rem", color: "#475569", cursor: "pointer", fontWeight: 500 }}>
                  <Zap size={11} style={{ display: "inline", marginRight: 4 }} />
                  Auto-fill Demo
                </button>
              </div>
            </div>

            <p style={{ textAlign: "center", marginTop: "1rem", color: "#64748b", fontSize: "0.875rem" }}>
              No account?{" "}
              <Link href="/signup" style={{ color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>Sign up</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
