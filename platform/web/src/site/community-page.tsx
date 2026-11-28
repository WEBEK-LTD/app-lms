/* eslint-disable @next/next/no-img-element -- our own Community screenshots, already sized. */
import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { siteMetadata } from "@/lib/seo";
import type { Lang } from "@/i18n";

/** Where the Community lives (src/proxy.ts maps it to /community/…). */
const COMMUNITY_URL = "https://community.yallapp.com.tr";

type Words = {
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  join: string;
  open: string;
  whatTitle: string;
  whatText: string;
  shotsTitle: string;
  shotsText: string;
  features: { icon: IconName; name: string; text: string }[];
  shots: { file: string; alt: string }[];
};

const WORDS: Record<Lang, Words> = {
  en: {
    title: "Yallapp Community",
    description: "Where people who build apps with Yallapp ask, learn and show their work: questions and tutorials, posts and stories, groups, messages, the Academy, challenges, pros, jobs and live events.",
    eyebrow: "Yallapp Community",
    intro: "Where people who build apps with Yallapp ask, learn and show their work. Free to join, on the web and in the Yallapp Community app.",
    join: "Join the Community",
    open: "Open the Community",
    whatTitle: "What you'll find there",
    whatText: "Everything in it is about making apps with Yallapp, and every answer stays for the next person who asks.",
    shotsTitle: "As it looks",
    shotsText: "The Community's own pages, by day and by night.",
    features: [
      { icon: "forum", name: "Questions and answers", text: "Ask about your app; members and the Yallapp team answer, and the best answer is marked." },
      { icon: "menu_book", name: "Tutorials", text: "Step-by-step guides written by members, with pictures and video." },
      { icon: "dynamic_feed", name: "Posts and stories", text: "Share progress in posts with photos, and quick stories that last a day." },
      { icon: "apps", name: "Showcase", text: "Show the apps you built, with their store links, and see what others made." },
      { icon: "groups", name: "Groups", text: "Public or private groups for a kind of app, a city or a team." },
      { icon: "chat", name: "Messages", text: "Talk to another member directly, with replies and photos." },
      { icon: "school", name: "Academy", text: "Courses with lessons and quizzes, and a certificate when you finish." },
      { icon: "emoji_events", name: "Challenges", text: "Build something on a theme, enter it from the showcase, and vote for the best." },
      { icon: "work", name: "Pros", text: "Members who build apps for others, with their services, and hire requests that open a conversation." },
      { icon: "assignment", name: "Jobs", text: "Post work around Yallapp apps, or apply to it. No money moves through the Community." },
      { icon: "event", name: "Events and live", text: "Online, live and in-person events, in your own time zone, with a live chat and the replay." },
      { icon: "workspace_premium", name: "Points and badges", text: "Points for helping others, levels, a leaderboard, and badges for pros, businesses and active members." },
    ],
    shots: [
      { file: "home", alt: "The Community's home: stories, a post with a photo and the feed" },
      { file: "academy", alt: "The Academy: a course with its lessons" },
      { file: "event-live", alt: "A live event with its time and the going button" },
      { file: "messages", alt: "A conversation between two members" },
    ],
  },
  ar: {
    title: "مجتمع Yallapp",
    description: "حيث يسأل من يبنون تطبيقاتهم مع Yallapp ويتعلّمون ويعرضون أعمالهم: أسئلة ودروس، ومنشورات وقصص، ومجموعات، ورسائل، والأكاديمية، والتحديات، والمحترفون، والوظائف، والفعاليات المباشرة.",
    eyebrow: "مجتمع Yallapp",
    intro: "حيث يسأل من يبنون تطبيقاتهم مع Yallapp ويتعلّمون ويعرضون أعمالهم. الانضمام مجاني، على الويب وفي تطبيق Yallapp Community.",
    join: "انضم إلى المجتمع",
    open: "افتح المجتمع",
    whatTitle: "ما ستجده هناك",
    whatText: "كل ما فيه يدور حول بناء التطبيقات مع Yallapp، وتبقى كل إجابة لمن يسأل بعدك.",
    shotsTitle: "كما يبدو",
    shotsText: "صفحات المجتمع نفسها، في الوضعين الفاتح والداكن.",
    features: [
      { icon: "forum", name: "أسئلة وإجابات", text: "اسأل عن تطبيقك، فيجيب الأعضاء وفريق Yallapp، وتُميَّز أفضل إجابة." },
      { icon: "menu_book", name: "دروس", text: "أدلة خطوة بخطوة يكتبها الأعضاء، بالصور والفيديو." },
      { icon: "dynamic_feed", name: "منشورات وقصص", text: "شارك تقدّمك في منشورات بالصور، وقصص سريعة تبقى يومًا واحدًا." },
      { icon: "apps", name: "معرض التطبيقات", text: "اعرض التطبيقات التي بنيتها مع روابطها في المتاجر، وشاهد ما صنعه الآخرون." },
      { icon: "groups", name: "مجموعات", text: "مجموعات عامة أو خاصة لنوع من التطبيقات أو لمدينة أو لفريق." },
      { icon: "chat", name: "رسائل", text: "تحدّث مع عضو آخر مباشرة، بالردود والصور." },
      { icon: "school", name: "الأكاديمية", text: "دورات بدروس واختبارات، وشهادة عند إتمامها." },
      { icon: "emoji_events", name: "تحديات", text: "ابنِ شيئًا حول موضوع، وشارك به من معرض التطبيقات، وصوّت للأفضل." },
      { icon: "work", name: "المحترفون", text: "أعضاء يبنون التطبيقات للآخرين، بخدماتهم، وطلبات توظيف تفتح محادثة." },
      { icon: "assignment", name: "وظائف", text: "انشر عملًا حول تطبيقات Yallapp أو تقدّم إليه. لا تمرّ أي أموال عبر المجتمع." },
      { icon: "event", name: "فعاليات وبث مباشر", text: "فعاليات عبر الإنترنت ومباشرة وحضورية، بتوقيتك، مع دردشة مباشرة والتسجيل." },
      { icon: "workspace_premium", name: "نقاط وشارات", text: "نقاط لمساعدة الآخرين، ومستويات، ولوحة متصدرين، وشارات للمحترفين والأعمال والأعضاء النشطين." },
    ],
    shots: [
      { file: "home", alt: "الصفحة الرئيسية للمجتمع: القصص ومنشور بصورة والخلاصة" },
      { file: "academy", alt: "الأكاديمية: دورة بدروسها" },
      { file: "event-live", alt: "فعالية مباشرة بموعدها وزر الحضور" },
      { file: "messages", alt: "محادثة بين عضوين" },
    ],
  },
  tr: {
    title: "Yallapp Community",
    description: "Yallapp ile uygulama yapanların sorduğu, öğrendiği ve işlerini gösterdiği yer: sorular ve rehberler, gönderiler ve hikâyeler, gruplar, mesajlar, Akademi, yarışmalar, profesyoneller, işler ve canlı etkinlikler.",
    eyebrow: "Yallapp Community",
    intro: "Yallapp ile uygulama yapanların sorduğu, öğrendiği ve işlerini gösterdiği yer. Katılmak ücretsiz; web’de ve Yallapp Community uygulamasında.",
    join: "Topluluğa katıl",
    open: "Topluluğu aç",
    whatTitle: "Orada neler var",
    whatText: "İçindeki her şey Yallapp ile uygulama yapmakla ilgili ve her cevap, sonra soran kişi için kalır.",
    shotsTitle: "Nasıl görünüyor",
    shotsText: "Topluluğun kendi sayfaları, açık ve koyu modda.",
    features: [
      { icon: "forum", name: "Soru ve cevap", text: "Uygulamanızı sorun; üyeler ve Yallapp ekibi cevaplar, en iyi cevap işaretlenir." },
      { icon: "menu_book", name: "Rehberler", text: "Üyelerin yazdığı, fotoğraflı ve videolu adım adım rehberler." },
      { icon: "dynamic_feed", name: "Gönderiler ve hikâyeler", text: "İlerlemenizi fotoğraflı gönderilerle ve bir gün süren hikâyelerle paylaşın." },
      { icon: "apps", name: "Vitrin", text: "Yaptığınız uygulamaları mağaza bağlantılarıyla gösterin, başkalarının yaptıklarını görün." },
      { icon: "groups", name: "Gruplar", text: "Bir uygulama türü, bir şehir ya da bir ekip için açık veya özel gruplar." },
      { icon: "chat", name: "Mesajlar", text: "Başka bir üyeyle doğrudan, yanıt ve fotoğraflarla konuşun." },
      { icon: "school", name: "Akademi", text: "Dersli ve testli kurslar; bitirdiğinizde bir sertifika." },
      { icon: "emoji_events", name: "Yarışmalar", text: "Bir temada bir şey yapın, vitrinden katılın ve en iyisine oy verin." },
      { icon: "work", name: "Profesyoneller", text: "Başkaları için uygulama yapan üyeler, hizmetleriyle; bir sohbet açan iş talepleri." },
      { icon: "assignment", name: "İşler", text: "Yallapp uygulamalarıyla ilgili iş ilanı verin ya da başvurun. Topluluk üzerinden para geçmez." },
      { icon: "event", name: "Etkinlikler ve canlı yayın", text: "Çevrim içi, canlı ve yüz yüze etkinlikler, kendi saat diliminizde; canlı sohbet ve tekrar izleme." },
      { icon: "workspace_premium", name: "Puanlar ve rozetler", text: "Başkalarına yardım için puanlar, seviyeler, bir lider tablosu ve profesyoneller, işletmeler ve aktif üyeler için rozetler." },
    ],
    shots: [
      { file: "home", alt: "Topluluğun ana sayfası: hikâyeler, fotoğraflı bir gönderi ve akış" },
      { file: "academy", alt: "Akademi: dersleriyle bir kurs" },
      { file: "event-live", alt: "Saati ve katılım düğmesiyle canlı bir etkinlik" },
      { file: "messages", alt: "İki üye arasında bir sohbet" },
    ],
  },
};

export function communityPageMetadata(lang: Lang): Metadata {
  const w = WORDS[lang];
  return siteMetadata(lang, { title: w.title, description: w.description, path: "/yallapp-community" });
}

/** Yallapp Community on the marketing site: what it is, what's in it, its own pages, and the way in. */
export function CommunityPage({ lang }: { lang: Lang }) {
  const w = WORDS[lang];
  const cta = "flex h-12 items-center gap-2 self-start rounded-xl bg-ember px-5 text-[15px] font-bold text-white no-underline hover:text-white";
  return (
    <MarketingPage eyebrow={w.eyebrow} title={w.title} intro={w.intro} lang={lang} trail={[{ name: w.title, path: "/yallapp-community" }]}>
      <Section id="join">
        <a href={COMMUNITY_URL} className={cta} data-community-cta="">
          <Icon name="groups" size={20} />
          {w.join}
          <Icon name="open_in_new" size={18} />
        </a>
      </Section>
      <Section tinted id="inside">
        <SectionTitle title={w.whatTitle} text={w.whatText} />
        <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]" data-community-features="">
          {w.features.map((f) => (
            <li key={f.name} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
              <Icon name={f.icon} size={26} className="text-ember" />
              <b className="text-[17px]">{f.name}</b>
              <span className="text-[15px] leading-relaxed text-ink-4">{f.text}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="looks">
        <SectionTitle title={w.shotsTitle} text={w.shotsText} />
        <div className="flex flex-wrap justify-center gap-6" data-community-shots="">
          {w.shots.map((s) => (
            <figure key={s.file} className="m-0 w-[240px] max-w-full overflow-hidden rounded-[28px] border-[6px] border-midnight bg-midnight">
              <img src={`/community/screens/${s.file}.webp`} alt={s.alt} width={390} height={700} loading="lazy" className="theme-light-only block h-auto w-full" />
              <img src={`/community/screens/${s.file}-dark.webp`} alt={s.alt} width={390} height={700} loading="lazy" className="theme-dark-only h-auto w-full" />
            </figure>
          ))}
        </div>
        <a href={COMMUNITY_URL} className={cta}>
          {w.open}
          <Icon name="arrow_forward" size={20} />
        </a>
      </Section>
    </MarketingPage>
  );
}
