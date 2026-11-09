import { useState } from "react";
import { requestOtp, setToken, verifyOtp } from "../api";
import type { Lang, Session } from "../api";
import { describeError } from "../errors";
import type { Strings } from "../i18n";
import { useCountdown } from "../hooks";

type Props = { s: Strings; lang: Lang; online: boolean; onDone: (session: Session) => void };

export default function Login({ s, lang, online, onDone }: Props) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [demo, setDemo] = useState("");
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useCountdown();

  const send = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await requestOtp(phone, consent);
      setSent(true); setOtp(""); setDemo(r.debug_otp ?? ""); setWait(30);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await verifyOtp(phone, otp);
      setToken(r.token);
      onDone(r);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <section className="slip login" aria-labelledby="login-title">
      <h2 id="login-title">{s.login_title}</h2>
      <p className="hint">{s.login_hint}</p>

      {!sent ? (
        <form onSubmit={(e) => { e.preventDefault(); if (consent && phone.length === 10 && !busy) void send(); }}>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{s.consent}</span>
          </label>
          <label className="field" htmlFor="phone">{s.phone_label}</label>
          <div className="row">
            <span className="prefix" aria-hidden="true">+91</span>
            <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone}
              placeholder={s.phone_ph} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
          </div>
          <button type="submit" className="btn primary block" disabled={!consent || phone.length !== 10 || busy || !online}>
            {busy ? s.sending : s.send_otp}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (otp.length === 6 && !busy) void verify(); }}>
          <p className="sent" role="status">{s.otp_sent(`+91 ${phone}`)}</p>
          <label className="field" htmlFor="otp">{s.otp_label}</label>
          <input id="otp" className="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
          {demo && (
            <p className="demo-otp">
              {s.demo_otp(demo)}{" "}
              <button type="button" className="link" onClick={() => setOtp(demo)}>{s.demo_fill}</button>
            </p>
          )}
          <button type="submit" className="btn primary block" disabled={otp.length !== 6 || busy || !online}>
            {busy ? s.verifying : s.verify}
          </button>
          <div className="row between">
            <button type="button" className="link" onClick={() => { setSent(false); setErr(null); setDemo(""); }}>{s.change_number}</button>
            {wait > 0
              ? <span className="hint">{s.resend_in(wait)}</span>
              : <button type="button" className="link" disabled={busy} onClick={() => void send()}>{s.resend}</button>}
          </div>
        </form>
      )}
      {err !== null && <p className="err" role="alert">{describeError(err, lang, s)}</p>}
    </section>
  );
}
