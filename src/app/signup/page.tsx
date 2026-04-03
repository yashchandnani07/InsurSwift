"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, User, Building2, Eye, EyeOff, AlertCircle, Check, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type SignupRole = "select" | "claimant" | "admin";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [mode, setMode] = useState<SignupRole>("select");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Claimant form
  const [claimantForm, setClaimantForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  // Admin form
  const [adminForm, setAdminForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", licId: "" });

  const handleClaimantSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!claimantForm.fullName || !claimantForm.email || !claimantForm.password) {
      setError("All fields are required.");
      return;
    }
    if (claimantForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (claimantForm.password !== claimantForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await signUp(claimantForm.email, claimantForm.password, {
        fullName: claimantForm.fullName,
        role: "claimant",
      });
      setSuccess(true);
      setTimeout(() => router.push("/claimant-dashboard"), 1500);
    } catch (err: any) {
      setError(err?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!adminForm.fullName || !adminForm.email || !adminForm.password || !adminForm.licId) {
      setError("All fields are required.");
      return;
    }
    if (adminForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await signUp(adminForm.email, adminForm.password, {
        fullName: adminForm.fullName,
        role: "admin",
        licId: adminForm.licId,
      });
      setSuccess(true);
      setTimeout(() => router.push("/admin-dashboard"), 1500);
    } catch (err: any) {
      setError(err?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, background: "#dcfce7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <Check size={28} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem" }}>Account Created!</h2>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      {/* Back to login */}
      <Link
        href="/login"
        style={{ position: "fixed", top: 20, left: 20, zIndex: 100, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8125rem", fontWeight: 500, textDecoration: "none" }}
      >
        ← Back to Login
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "5rem 1.5rem 2rem" }}>

        {/* ── ROLE SELECT ─────────────────────────────────── */}
        {mode === "select" && (
          <div style={{ width: "100%", maxWidth: 480 }}>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <div style={{ width: 52, height: 52, background: "#1d4ed8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <Shield size={26} color="#fff" />
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Create Account</h1>
              <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.4rem" }}>Choose your account type to get started</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                onClick={() => { setMode("claimant"); setError(""); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#1d4ed8"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,78,216,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 44, height: 44, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={20} color="#1d4ed8" />
                  </div>
                  <div>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Claimant Account</p>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "0.2rem 0 0" }}>Submit and track your insurance claims</p>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </button>

              <button
                onClick={() => { setMode("admin"); setError(""); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem", background: "#0f172a", border: "1px solid #0f172a", borderRadius: 10, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1e293b")}
                onMouseLeave={e => (e.currentTarget.style.background = "#0f172a")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={20} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff", margin: 0 }}>Admin / LIC Agent</p>
                    <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: "0.2rem 0 0" }}>Insurance providers & institutional access</p>
                  </div>
                </div>
                <ChevronRight size={18} color="#64748b" />
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "#94a3b8", marginTop: "2rem" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </p>
          </div>
        )}

        {/* ── CLAIMANT SIGNUP ─────────────────────────────── */}
        {mode === "claimant" && (
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "2.5rem", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: 40, height: 40, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={20} color="#1d4ed8" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Claimant Sign Up</h2>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>Create your claims portal account</p>
                  </div>
                </div>
                <button onClick={() => { setMode("select"); setError(""); }} style={{ background: "none", border: "none", color: "#1d4ed8", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  ← Back to options
                </button>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, marginBottom: "1.25rem" }}>
                  <AlertCircle size={14} color="#dc2626" />
                  <p style={{ fontSize: "0.8125rem", color: "#dc2626", margin: 0 }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleClaimantSignup} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>Full Name</label>
                  <input type="text" className="input-field" placeholder="Rahul Mehta" value={claimantForm.fullName} onChange={e => setClaimantForm(f => ({ ...f, fullName: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>Email Address</label>
                  <input type="email" className="input-field" placeholder="you@example.com" value={claimantForm.email} onChange={e => setClaimantForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} className="input-field" placeholder="Min 8 characters" value={claimantForm.password} onChange={e => setClaimantForm(f => ({ ...f, password: e.target.value }))} style={{ paddingRight: "2.75rem" }} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>Confirm Password</label>
                  <input type="password" className="input-field" placeholder="Re-enter password" value={claimantForm.confirmPassword} onChange={e => setClaimantForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Creating Account…" : "Create Claimant Account"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── ADMIN SIGNUP ─────────────────────────────────── */}
        {mode === "admin" && (
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "2.5rem", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={20} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff", margin: 0 }}>Admin / LIC Agent Sign Up</h2>
                    <p style={{ fontSize: "0.8125rem", color: "#94a3b8", margin: 0 }}>Institutional access registration</p>
                  </div>
                </div>
                <button onClick={() => { setMode("select"); setError(""); }} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  ← Back to options
                </button>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, marginBottom: "1.25rem" }}>
                  <AlertCircle size={14} color="#f87171" />
                  <p style={{ fontSize: "0.8125rem", color: "#f87171", margin: 0 }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleAdminSignup} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.4rem" }}>Full Name</label>
                  <input type="text" className="input-field" placeholder="Arvind Kumar" value={adminForm.fullName} onChange={e => setAdminForm(f => ({ ...f, fullName: e.target.value }))} style={{ background: "#1e293b", borderColor: "#334155", color: "#f1f5f9" }} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.4rem" }}>LIC / Provider ID</label>
                  <input type="text" className="input-field" placeholder="LIC-ADM-001" value={adminForm.licId} onChange={e => setAdminForm(f => ({ ...f, licId: e.target.value }))} style={{ background: "#1e293b", borderColor: "#334155", color: "#f1f5f9" }} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.4rem" }}>Email Address</label>
                  <input type="email" className="input-field" placeholder="admin@insurer.com" value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} style={{ background: "#1e293b", borderColor: "#334155", color: "#f1f5f9" }} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.4rem" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} className="input-field" placeholder="Min 8 characters" value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} style={{ background: "#1e293b", borderColor: "#334155", color: "#f1f5f9", paddingRight: "2.75rem" }} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#cbd5e1", marginBottom: "0.4rem" }}>Confirm Password</label>
                  <input type="password" className="input-field" placeholder="Re-enter password" value={adminForm.confirmPassword} onChange={e => setAdminForm(f => ({ ...f, confirmPassword: e.target.value }))} style={{ background: "#1e293b", borderColor: "#334155", color: "#f1f5f9" }} required />
                </div>
                <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem", background: loading ? "#334155" : "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: "0.9375rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Creating Account…" : "Create Admin Account"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
