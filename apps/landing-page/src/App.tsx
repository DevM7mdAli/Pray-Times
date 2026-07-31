import { useEffect, useMemo, useState } from "react";
import {
  CITIES,
  cityById,
  fetchAyah,
  fetchPrayerDay,
  formatArabicTime,
  formatRemainingArabic,
  nextPrayerFor,
  prayerNameAr,
  type Ayah,
  type PrayerDay,
  type PrayerKey
} from "@pray-times/core";

const PRAYER_KEYS: readonly PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const REPOSITORY_URL = "https://github.com/DevM7mdAli/Pray-Times";

function BrandMark({ className = "" }: { className?: string }) {
  return <img className={className} src="/Pray-Times/icon.png" width="48" height="48" alt="" />;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Zm0 6v5m0 3h.01" /></svg>;
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function prayerCard(day: PrayerDay | undefined, loading: boolean, error: string | undefined) {
  if (loading) {
    return <div className="preview-empty"><span className="preview-orb" /><p>نتحقق من مسار اليوم…</p></div>;
  }
  if (error || !day) {
    return <div className="preview-empty"><span className="preview-orb preview-orb-error" /><p>{error ?? "تعذّر عرض المواقيت"}</p><span>لن نعرض توقيتًا غير متحقق.</span></div>;
  }
  const next = nextPrayerFor(day);
  return (
    <>
      <div className="preview-date">{day.city.nameAr} · {day.hijri.day} {day.hijri.monthAr} {day.hijri.year} هـ</div>
      <div className="next-block">
        <span>الصلاة القادمة{next.isTomorrow ? " غدًا" : ""}</span>
        <div><strong>{prayerNameAr(next.key)}</strong><time>{formatArabicTime(next.time)}</time></div>
        <p>متبقٍ {formatRemainingArabic(next.minutesUntil)}</p>
      </div>
      <div className="preview-path" aria-label="مسار الصلوات الخمس">
        {PRAYER_KEYS.map((key) => (
          <div className={key === next.key ? "preview-stop is-current" : "preview-stop"} key={key}>
            <i aria-hidden="true" />
            <span>{prayerNameAr(key)}</span>
            <time>{formatArabicTime(day.timings[key])}</time>
          </div>
        ))}
      </div>
      <p className="preview-method">{day.method.nameAr} · تم التحقق الآن</p>
    </>
  );
}

export function App() {
  const [cityId, setCityId] = useState("riyadh");
  const [day, setDay] = useState<PrayerDay>();
  const [ayah, setAyah] = useState<Ayah>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const city = useMemo(() => cityById(cityId) ?? CITIES[0], [cityId]);

  useEffect(() => {
    if (!city) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    void fetchPrayerDay(city)
      .then((result) => { if (active) setDay(result); })
      .catch(() => { if (active) setError("تعذّر التحقق من مزود المواقيت الآن."); })
      .finally(() => { if (active) setLoading(false); });
    void fetchAyah().then((result) => { if (active) setAyah(result); }).catch(() => { if (active) setAyah(undefined); });
    return () => { active = false; };
  }, [city]);

  return (
    <div className="site-shell antialiased">
      <header className="site-header">
        <a className="site-brand" href="#top" aria-label="أوقات الصلاة، بداية الصفحة"><BrandMark /><span>أوقات الصلاة</span></a>
        <nav aria-label="التنقل الرئيسي"><a href="#method">كيف نتحقق؟</a><a href="#privacy">الخصوصية</a></nav>
        <a className="header-cta" href={REPOSITORY_URL} target="_blank" rel="noreferrer">افتح المشروع <ArrowIcon /></a>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow"><span /> لا ينبغي أن يكون وقت الصلاة تخمينًا</p>
            <h1>اعرف الصلاة القادمة،<br /><em>بثقة.</em></h1>
            <p className="hero-lede">إضافة عربية هادئة تعرض مسار يومك من الفجر إلى العشاء، وتتحقق من الإحداثيات والتاريخ وطريقة الحساب قبل أن تعرض الوقت.</p>
            <div className="hero-actions">
              <a className="button button-primary" href={REPOSITORY_URL} target="_blank" rel="noreferrer">افتح المشروع <ArrowIcon /></a>
              <a className="text-link" href="#method">تعرف على طريقة التحقق</a>
            </div>
            <p className="micro-proof"><CheckIcon /> تحفظ المدينة على جهازك فقط</p>
          </div>

          <div className="hero-preview-wrap">
            <div className="light-aura" aria-hidden="true" />
            <section className="live-preview" aria-label="معاينة مباشرة للإضافة">
              <div className="preview-top"><div className="preview-brand"><BrandMark /><span><small>مسار اليوم</small>أوقات الصلاة</span></div><span className="live-dot">معاينة مباشرة</span></div>
              <label className="preview-city">المدينة
                <select value={cityId} onChange={(event) => setCityId(event.target.value)} aria-label="اختر مدينة للمعاينة">
                  {CITIES.map((option) => <option key={option.id} value={option.id}>{option.nameAr}</option>)}
                </select>
              </label>
              {prayerCard(day, loading, error)}
            </section>
          </div>
        </section>

        <section className="dayline" aria-label="مسار يوم الصلوات الخمس">
          <p>خمسة مواقيت. <span>مسار واحد واضح.</span></p>
          <div className="dayline-track">{PRAYER_KEYS.map((key) => <span key={key}>{prayerNameAr(key)}</span>)}</div>
        </section>

        <section id="method" className="method section-wrap">
          <div className="method-intro"><p className="eyebrow eyebrow-dark"><span /> دقة يفهمها المستخدم</p><h2>لا نطلب منك<br />أن تثق بنا بصمت.</h2><p>الوقت المعروض يمر بثلاثة فحوص واضحة. إذا لم تطابق النتيجة المدينة أو اليوم أو طريقة الحساب، لا نعرضها.</p></div>
          <div className="verification-list">
            <article><PinIcon /><div><span>إحداثيات المدينة</span><p>قائمة مدن منسقة بإحداثيات ثابتة، لا بحث نصي قد يخطئ موقعك.</p></div></article>
            <article><CheckIcon /><div><span>تاريخ ومنطقة زمنية</span><p>نقارن التاريخ والمنطقة الزمنية والإحداثيات التي يعيدها المزود قبل العرض.</p></div></article>
            <article><ShieldIcon /><div><span>طريقة معلنة</span><p>أم القرى، مكة المكرمة. تظهر الطريقة دائمًا مع ملاحظة اختلاف الجهات المحلية.</p></div></article>
          </div>
        </section>

        <section id="privacy" className="privacy section-wrap">
          <div className="privacy-symbol" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <div><p className="eyebrow"><span /> خصوصيتك جزء من الدقة</p><h2>الموقع ليس استعلامًا غامضًا.</h2><p>تختار مدينة من قائمة واضحة. نحفظ هذا الاختيار في متصفحك فقط ونرسل إحداثياتها إلى مزود المواقيت للحصول على وقت اليوم. لا حساب، ولا تتبع، ولا ملف شخصي.</p></div>
        </section>

        <section className="ayah-section section-wrap">
          <div><p className="eyebrow eyebrow-dark"><span /> مساحة هادئة</p><h2>آية مختارة،<br />بلا تشتيت.</h2></div>
          <blockquote>
            {ayah ? <><p>﴿{ayah.text}﴾</p><cite>{ayah.surah.name} · {ayah.numberInSurah}</cite></> : <><p>تظهر الآية عند توفر الاتصال.</p><cite>النص القرآني</cite></>}
          </blockquote>
        </section>

        <section className="closing section-wrap"><p className="eyebrow"><span /> وقتك بين يديك</p><h2>افتح الإضافة.<br /><em>واعرف الوقت القادم.</em></h2><a className="button button-primary" href={REPOSITORY_URL} target="_blank" rel="noreferrer">افتح المشروع <ArrowIcon /></a></section>
      </main>

      <footer className="site-footer"><a className="site-brand" href="#top"><BrandMark /><span>أوقات الصلاة</span></a><span>مصمم لليوم، من الفجر إلى العشاء.</span><a href={REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a></footer>
    </div>
  );
}
