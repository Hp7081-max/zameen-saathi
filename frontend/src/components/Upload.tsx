import { useEffect, useRef, useState } from "react";
import { extract } from "../api";
import type { Lang, LandRecord } from "../api";
import { describeError } from "../errors";
import type { Strings } from "../i18n";
import { useElapsed } from "../hooks";
import { ACCEPT, checkFile, fileSize, isPdf } from "../util";
import { IconCamera, IconCheck, IconFile, IconNext, IconPdf, IconTrash, IconUpload, IconX } from "./Icons";

type Item = {
  id: number; file: File; status: "waiting" | "reading" | "done" | "failed";
  plots?: number; err?: unknown; bad?: "err_big" | "err_type"; thumb?: string;
};

type Props = {
  s: Strings; lang: Lang; online: boolean; haveRecord: number; sampleBusy: boolean;
  onRecords: (recs: LandRecord[], navigate: boolean) => void; onSample: () => void; onContinue: () => void; onFail: (e: unknown) => void;
};

let nextId = 1;

export default function Upload({ s, lang, online, haveRecord, sampleBusy, onRecords, onSample, onContinue, onFail }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const thumbs = useRef<string[]>([]);
  const reading = items.find((i) => i.status === "reading");
  const sec = useElapsed(!!reading);
  const working = !!reading || items.some((i) => i.status === "waiting");

  useEffect(() => () => thumbs.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const patch = (id: number, p: Partial<Item>) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...p } : i)));

  /** कतार की फ़ाइलें एक-एक करके पढ़ता है (सर्वर पर OCR भारी है, समानांतर नहीं)। सब ठीक रहें तो आगे बढ़ता है। */
  const run = async (queue: Item[]) => {
    const recs: LandRecord[] = [];
    let failed = 0;
    for (const it of queue) {
      patch(it.id, { status: "reading", err: undefined });
      try {
        const r = await extract(it.file);
        recs.push(r);
        patch(it.id, { status: "done", plots: r.plots.length });
      } catch (e) {
        failed++;
        patch(it.id, { status: "failed", err: e });
        onFail(e); // जैसे 401: सत्र खत्म हुआ तो ऊपर वाला लॉगिन पर ले जाएगा
      }
    }
    if (recs.length) onRecords(recs, failed === 0);
  };

  const add = (files: File[]) => {
    const fresh: Item[] = files.map((file) => {
      const bad = checkFile(file) ?? undefined;
      const thumb = !bad && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      if (thumb) thumbs.current.push(thumb);
      return { id: nextId++, file, bad, thumb, status: bad ? "failed" : "waiting" } as Item;
    });
    if (!fresh.length) return;
    setItems((all) => [...all, ...fresh]);
    void run(fresh.filter((i) => !i.bad));
  };

  const retry = (it: Item) => void run([it]);
  const remove = (id: number) => setItems((all) => all.filter((i) => i.id !== id));
  const pick = (e: { target: HTMLInputElement }) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; };

  const statusText = (it: Item) =>
    it.status === "waiting" ? s.st_waiting
    : it.status === "reading" ? s.st_reading(sec)
    : it.status === "done" ? s.st_done(it.plots ?? 0)
    : it.bad ? s[it.bad] : describeError(it.err, lang, s);

  return (
    <section aria-labelledby="view-title">
      <h2 id="view-title" tabIndex={-1}>{s.upload_title}</h2>

      <div className={`dropzone${drag ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(Array.from(e.dataTransfer.files)); }}>
        <IconUpload size={38} className="dz-icon" />
        <p className="dz-title">{s.drop_title}</p>
        <p className="hint">{s.drop_hint}</p>
        <div className="row wrap center">
          <button type="button" className="btn primary" disabled={!online} onClick={() => fileRef.current?.click()}><IconFile size={18} /> {s.pick}</button>
          <button type="button" className="btn" disabled={!online} onClick={() => camRef.current?.click()}><IconCamera size={18} /> {s.camera}</button>
        </div>
        <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={pick} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        <p className="hint small">{s.limits}</p>
      </div>

      {items.length > 0 && (
        <ul className="files" aria-live="polite">
          {items.map((it) => (
            <li key={it.id} className={`file ${it.status}`}>
              {it.thumb ? <img src={it.thumb} alt="" className="thumb" /> : <span className="thumb ph">{isPdf(it.file) ? <IconPdf /> : <IconFile />}</span>}
              <div className="file-body">
                <p className="file-name">{it.file.name} <span className="hint">{fileSize(it.file.size)}</span></p>
                <p className="file-status">
                  {it.status === "done" && <IconCheck size={16} />}
                  {it.status === "failed" && <IconX size={16} />}
                  {it.status === "reading" && <span className="spin" aria-hidden="true" />}
                  <span role={it.status === "failed" ? "alert" : undefined}>{statusText(it)}</span>
                </p>
                {it.status === "reading" && isPdf(it.file) && sec >= 8 && <p className="hint small">{s.pdf_slow}</p>}
              </div>
              {it.status === "failed" && (
                <div className="file-actions">
                  {!it.bad && <button type="button" className="btn small" onClick={() => retry(it)} disabled={working || !online}>{s.retry}</button>}
                  <button type="button" className="btn ghost small icon" onClick={() => remove(it.id)} aria-label={s.remove} title={s.remove}><IconTrash size={16} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {haveRecord > 0 && !working && (
        <div className="continue">
          <p>{s.have_record(haveRecord)}</p>
          <button type="button" className="btn primary" onClick={onContinue}>{s.continue_review} <IconNext size={18} /></button>
        </div>
      )}

      <div className="tips">
        <h3>{s.tips_title}</h3>
        <ul>{s.tips.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>

      <div className="samples">
        <h3>{s.sample_title}</h3>
        <div className="sample-grid">
          <div>
            <button type="button" className="btn" disabled={sampleBusy || !online} onClick={onSample}>
              {sampleBusy ? s.checking : s.sample_village}
            </button>
            <p className="hint small">{s.sample_village_hint}</p>
          </div>
          <div>
            <p className="sample-scan-title">{s.sample_scan}</p>
            <ul className="sample-links">
              {s.sample_files.map(([f, label]) => (
                <li key={f}><a href={`/samples/${f}`} download>{isPdf({ name: f, type: "" }) ? <IconPdf size={16} /> : <IconFile size={16} />}{label}</a></li>
              ))}
            </ul>
            <p className="hint small">{s.sample_scan_hint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
