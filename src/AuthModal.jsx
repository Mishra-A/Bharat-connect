import React, { useState } from "react";
import { X, LogIn, UserPlus } from "lucide-react";
import { api, saveSession } from "./api.js";

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const result = mode === "login"
        ? await api.login({ username, password })
        : await api.register({ username, email, password, display_name: displayName || username, preferred_language: "en" });
      saveSession(result);
      onSuccess(result.user);
    } catch (err) {
      setError(err.message || "Could not authenticate.");
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="compose-modal auth-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-head"><div><h2>{mode === "login" ? "Welcome back" : "Join BharatConnect"}</h2><p className="auth-subtitle">{mode === "login" ? "Sign in to join the conversation." : "Create your account and find your people."}</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div>
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && <label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name" maxLength={80}/></label>}
        <label>Username or email<input required value={username} onChange={e=>setUsername(e.target.value)} placeholder={mode === "login" ? "Username or email" : "Choose a username"} autoComplete="username"/></label>
        {mode === "register" && <label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>}
        <label>Password<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"}/></label>
        {error && <div className="auth-error">{error}</div>}
        <button className="small-primary auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? <><LogIn size={16}/> Sign in</> : <><UserPlus size={16}/> Create account</>}</button>
      </form>
      <div className="auth-switch">{mode === "login" ? "New to BharatConnect?" : "Already have an account?"} <button onClick={()=>{setMode(mode==="login"?"register":"login");setError("")}}>{mode==="login"?"Create account":"Sign in"}</button></div>
      <p className="auth-disclaimer">Prototype authentication. Email verification, password reset and production-grade session storage still need to be added.</p>
    </div>
  </div>
}
