import { useState } from "react";
import { sendContact } from "../api";
import type { ContactKind, Lang } from "../api";
import { describeError } from "../errors";
import { IconCheck, IconMail, IconPhoneCall } from "../components/Icons";
import Page from "../components/Page";
import type { Strings } from "../i18n";
import type { Site } from "../site";

const KINDS: ContactKind[] = ["feedback", "partner", "problem", "other"];
const MAX = 1500;
const EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL ?? "";
const PHONE: string = import.meta.env.VITE_CONTACT_PHONE ?? "";

type Props = { s: Strings; t: Site; lang: Lang; online: boolean; initialKind: string | null };

export default function Contact({ s, t, lang, online, initialKind }: Props) {
  const [kind, setKind] = useState<ContactKind>(KINDS.includes(initialKind as ContactKind) ? (initialKind as ContactKind) : "feedback");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // छिपा खाना: इंसान खाली छोड़ता है, बॉट अक्सर भर देते हैं
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<unknown>(null);

  const ready = message.trim().length >= 5 && !busy && online;
  const submit = async () => {
    if (!ready) return;
    setBusy(true); setErr(null);
    try { await sendContact({ name, contact, message, kind, website }); setSent(true); }
    catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const again = () => { setSent(false); setMessage(""); };

  return (
    <Page title={t.contact_title} lead={t.contact_lead}>
      {sent ? (
        <div className="card gate" role="status">
          <span className="tile"><IconCheck size={24} /></span>
          <h2>{t.c_sent_title}</h2>
          <p className="muted">{t.c_sent_text}</p>
          <button type="button" className="btn" onClick={again}>{t.c_again}</button>
        </div>
      ) : (
        <form className="card form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label className="field" htmlFor="c-kind">{t.c_kind}</label>
          <select id="c-kind" value={kind} onChange={(e) => setKind(e.target.value as ContactKind)}>
            {KINDS.map((k) => <option key={k} value={k}>{t.c_kinds[k]}</option>)}
          </select>
          <div className="two tight">
            <div><label className="field" htmlFor="c-name">{t.c_name}</label><input id="c-name" type="text" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="field" htmlFor="c-contact">{t.c_contact}</label><input id="c-contact" type="text" autoComplete="email" maxLength={120} placeholder={t.c_contact_ph} value={contact} onChange={(e) => setContact(e.target.value)} /></div>
          </div>
          <label className="field" htmlFor="c-msg">{t.c_message}</label>
          <textarea id="c-msg" rows={6} maxLength={MAX} placeholder={t.c_message_ph} value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="muted small right">{t.c_count(message.length, MAX)}</p>
          <div className="hp" aria-hidden="true"><label>Website<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
          <button type="submit" className="btn primary block" disabled={!ready}>{busy ? t.c_sending : t.c_send}</button>
          {err !== null && <p className="err" role="alert">{describeError(err, lang, s)}</p>}
          <p className="muted small">{t.c_privacy}</p>
        </form>
      )}
      {(EMAIL || PHONE) && (
        <section className="card" aria-labelledby="c-direct">
          <h2 id="c-direct">{t.c_direct}</h2>
          <ul className="plainlist">
            {EMAIL && <li><a className="with-icon" href={`mailto:${EMAIL}`}><IconMail size={18} /> {EMAIL}</a></li>}
            {PHONE && <li><a className="with-icon" href={`tel:${PHONE}`}><IconPhoneCall size={18} /> {PHONE}</a></li>}
          </ul>
        </section>
      )}
    </Page>
  );
}
