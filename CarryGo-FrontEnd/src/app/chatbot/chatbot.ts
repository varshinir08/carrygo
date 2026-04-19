import {
  Component, OnInit, AfterViewChecked, ViewChild,
  ElementRef, ChangeDetectorRef, HostListener, Inject, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type Lang = 'en' | 'hi' | 'te' | 'ta';

interface Message { from: 'bot' | 'user'; text: string; time: string; }
interface QuickReply { label: string; action: string; }

/* ── Multilingual content ── */
const UI: Record<Lang, { placeholder: string; title: string; subtitle: string; send: string }> = {
  en: { placeholder: 'Type a message…', title: 'CarryBot', subtitle: 'Your delivery assistant', send: 'Send' },
  hi: { placeholder: 'संदेश लिखें…',    title: 'CarryBot', subtitle: 'आपका डिलीवरी सहायक',  send: 'भेजें' },
  te: { placeholder: 'సందేశం టైప్ చేయండి…', title: 'CarryBot', subtitle: 'మీ డెలివరీ సహాయకుడు', send: 'పంపు' },
  ta: { placeholder: 'செய்தி தட்டச்சு செய்யவும்…', title: 'CarryBot', subtitle: 'உங்கள் டெலிவரி உதவியாளர்', send: 'அனுப்பு' },
};

const GREETINGS: Record<Lang, string> = {
  en: "Hi there! 👋 I'm CarryBot, your delivery assistant.\n\nHow can I help you today?",
  hi: "नमस्ते! 👋 मैं CarryBot हूँ, आपका डिलीवरी सहायक।\n\nआज मैं आपकी कैसे मदद कर सकता हूँ?",
  te: "నమస్కారం! 👋 నేను CarryBot, మీ డెలివరీ సహాయకుడిని.\n\nఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?",
  ta: "வணக்கம்! 👋 நான் CarryBot, உங்கள் டெலிவரி உதவியாளர்.\n\nஇன்று நான் உங்களுக்கு எப்படி உதவலாம்?",
};

const QUICK_REPLIES: Record<Lang, QuickReply[]> = {
  en: [
    { label: '📦 Send a Parcel',    action: 'send' },
    { label: '📋 Track Delivery',   action: 'track' },
    { label: '💳 Wallet',           action: 'wallet' },
    { label: '🚴 Be a Commuter',    action: 'porter' },
    { label: '❓ Help',             action: 'help' },
  ],
  hi: [
    { label: '📦 पार्सल भेजें',    action: 'send' },
    { label: '📋 डिलीवरी ट्रैक करें', action: 'track' },
    { label: '💳 वॉलेट',          action: 'wallet' },
    { label: '🚴 कमाई करें',        action: 'porter' },
    { label: '❓ सहायता',          action: 'help' },
  ],
  te: [
    { label: '📦 పార్సెల్ పంపు',    action: 'send' },
    { label: '📋 డెలివరీ ట్రాక్',  action: 'track' },
    { label: '💳 వాలెట్',          action: 'wallet' },
    { label: '🚴 సంపాదన',          action: 'porter' },
    { label: '❓ సహాయం',           action: 'help' },
  ],
  ta: [
    { label: '📦 பார்சல் அனுப்பு',  action: 'send' },
    { label: '📋 டெலிவரி தடம்',    action: 'track' },
    { label: '💳 வாலட்',           action: 'wallet' },
    { label: '🚴 சம்பாதி',          action: 'porter' },
    { label: '❓ உதவி',            action: 'help' },
  ],
};

const RESPONSES: Record<Lang, Record<string, string>> = {
  en: {
    send:   "📦 Let's send a parcel!\n\nClick the button below and I'll take you to the booking page where you can fill in pickup & drop details.",
    track:  "📋 To track your deliveries:\n\n1. Go to My Deliveries in the sidebar\n2. You'll see all your orders with live status\n3. Active orders show real-time updates\n\nWant me to take you there?",
    wallet: "💳 Your CarryGo Wallet lets you:\n\n• Pay for deliveries instantly\n• Add money via UPI / Card\n• View transaction history\n\nShall I open your wallet?",
    porter: "🚴 Want to earn with CarryGo?\n\nSwitch to Porter Mode to:\n• Accept delivery requests on your route\n• Earn money per delivery\n• Set your own schedule\n\nTake me to Porter Dashboard?",
    help:   "❓ Here's what I can help with:\n\n📦 Send a parcel\n📋 Track your deliveries\n💳 Manage your wallet\n🚴 Switch to Porter mode\n🗺️ Use the map to select locations\n\nJust type or tap a quick reply!",
    home:   "🏠 Taking you to the Home page!",
    default:"I didn't quite get that 🤔\n\nTry one of the quick replies below, or ask me about sending parcels, tracking deliveries, or your wallet!",
  },
  hi: {
    send:   "📦 पार्सल भेजते हैं!\n\nनीचे दिए बटन पर क्लिक करें और मैं आपको बुकिंग पेज पर ले जाऊंगा।",
    track:  "📋 डिलीवरी ट्रैक करने के लिए:\n\n1. साइडबार में 'मेरी डिलीवरी' पर जाएं\n2. सभी ऑर्डर की लाइव स्थिति देखें\n\nक्या मैं आपको वहाँ ले जाऊं?",
    wallet: "💳 आपका CarryGo Wallet:\n\n• तुरंत डिलीवरी का भुगतान करें\n• UPI/Card से पैसे जोड़ें\n• लेनदेन इतिहास देखें\n\nवॉलेट खोलें?",
    porter: "🚴 CarryGo से कमाई करें!\n\nपोर्टर मोड पर स्विच करें:\n• अपने रास्ते पर डिलीवरी स्वीकार करें\n• प्रति डिलीवरी पैसे कमाएं\n\nपोर्टर डैशबोर्ड खोलें?",
    help:   "❓ मैं इसमें मदद कर सकता हूँ:\n\n📦 पार्सल भेजना\n📋 डिलीवरी ट्रैक करना\n💳 वॉलेट प्रबंधन\n🚴 पोर्टर मोड\n\nकोई भी बटन दबाएं!",
    home:   "🏠 होम पेज पर ले जा रहा हूँ!",
    default:"मुझे समझ नहीं आया 🤔\n\nनीचे दिए विकल्पों में से कोई चुनें!",
  },
  te: {
    send:   "📦 పార్సెల్ పంపుదాం!\n\nదిగువ బటన్ నొక్కండి, మిమ్మల్ని బుకింగ్ పేజీకి తీసుకెళ్తాను.",
    track:  "📋 డెలివరీ ట్రాక్ చేయడానికి:\n\n1. సైడ్‌బార్‌లో 'నా డెలివరీలు' కి వెళ్ళండి\n2. అన్ని ఆర్డర్ల స్థితి చూడండి\n\nమిమ్మల్ని అక్కడికి తీసుకెళ్ళమా?",
    wallet: "💳 మీ CarryGo వాలెట్:\n\n• వెంటనే చెల్లించండి\n• UPI/కార్డ్ ద్వారా డబ్బు జోడించండి\n\nవాలెట్ తెరవమా?",
    porter: "🚴 CarryGo తో సంపాదించండి!\n\nపోర్టర్ మోడ్‌కి మారండి:\n• మీ మార్గంలో డెలివరీలు అంగీకరించండి\n• డెలివరీ కి డబ్బులు సంపాదించండి\n\nపోర్టర్ డ్యాష్‌బోర్డ్ తెరవమా?",
    help:   "❓ నేను సహాయం చేయగలిగేవి:\n\n📦 పార్సెల్ పంపడం\n📋 డెలివరీ ట్రాక్ చేయడం\n💳 వాలెట్ నిర్వహణ\n🚴 పోర్టర్ మోడ్\n\nఏదైనా బటన్ నొక్కండి!",
    home:   "🏠 హోమ్ పేజీకి తీసుకెళ్తున్నాను!",
    default:"నాకు అర్థం కాలేదు 🤔\n\nదిగువ ఎంపికలలో ఒకటి ఎంచుకోండి!",
  },
  ta: {
    send:   "📦 பார்சல் அனுப்புவோம்!\n\nகீழே உள்ள பட்டனை அழுத்தி புக்கிங் பக்கத்திற்கு செல்லுங்கள்.",
    track:  "📋 டெலிவரி தடமறிய:\n\n1. சைட்பாரில் 'என் டெலிவரிகள்' பார்க்கவும்\n2. அனைத்து ஆர்டர்களின் நிலை காண்க\n\nஆங்கே அழைத்துச் செல்லட்டுமா?",
    wallet: "💳 உங்கள் CarryGo Wallet:\n\n• உடனடியாக பணம் செலுத்தவும்\n• UPI/கார்டு மூலம் பணம் சேர்க்கவும்\n\nவாலட் திறக்கட்டுமா?",
    porter: "🚴 CarryGo மூலம் சம்பாதியுங்கள்!\n\nபோர்டர் மோட்டிற்கு மாறுங்கள்:\n• உங்கள் வழியில் டெலிவரிகளை ஏற்கவும்\n• ஒவ்வொரு டெலிவரிக்கும் சம்பாதியுங்கள்\n\nபோர்டர் டேஷ்போர்டு திறக்கட்டுமா?",
    help:   "❓ நான் உதவக்கூடியவை:\n\n📦 பார்சல் அனுப்புதல்\n📋 டெலிவரி தடம்\n💳 வாலட் நிர்வாகம்\n🚴 போர்டர் மோட்\n\nஏதாவது பட்டனை அழுத்துங்கள்!",
    home:   "🏠 முகப்புப் பக்கத்திற்கு அழைத்துச் செல்கிறேன்!",
    default:"எனக்கு புரியவில்லை 🤔\n\nகீழே உள்ள விருப்பங்களில் ஒன்றை தேர்ந்தெடுக்கவும்!",
  },
};

/* ── Keywords for intent detection ── */
const KEYWORDS: Record<Lang, Record<string, string[]>> = {
  en: {
    send:   ['send','parcel','package','book','deliver','booking'],
    track:  ['track','status','where','delivery','deliveries','order','orders','my order'],
    wallet: ['wallet','balance','money','pay','payment','add money','recharge'],
    porter: ['porter','commuter','earn','driver','rider','income','job'],
    help:   ['help','how','what','guide','assist','support'],
    home:   ['home','dashboard','main','back'],
  },
  hi: {
    send:   ['भेजो','पार्सल','पैकेज','बुक','डिलीवरी'],
    track:  ['ट्रैक','स्थिति','कहाँ','ऑर्डर','मेरे ऑर्डर'],
    wallet: ['वॉलेट','बैलेंस','पैसे','भुगतान','रिचार्ज'],
    porter: ['पोर्टर','कमाई','ड्राइवर','आय'],
    help:   ['मदद','कैसे','क्या','सहायता'],
    home:   ['होम','डैशबोर्ड','मुख्य'],
  },
  te: {
    send:   ['పంపు','పార్సెల్','బుక్','డెలివరీ'],
    track:  ['ట్రాక్','స్థితి','ఎక్కడ','ఆర్డర్','నా ఆర్డర్లు'],
    wallet: ['వాలెట్','బ్యాలెన్స్','డబ్బు','చెల్లింపు'],
    porter: ['పోర్టర్','సంపాదన','డ్రైవర్','ఆదాయం'],
    help:   ['సహాయం','ఎలా','ఏమిటి','గైడ్'],
    home:   ['హోమ్','డ్యాష్‌బోర్డ్','వెనక్కి'],
  },
  ta: {
    send:   ['அனுப்பு','பார்சல்','புக்','டெலிவரி'],
    track:  ['தடம்','நிலை','எங்கே','ஆர்டர்'],
    wallet: ['வாலட்','பேலன்ஸ்','பணம்','கட்டணம்'],
    porter: ['போர்டர்','சம்பாதி','டிரைவர்','வருமானம்'],
    help:   ['உதவி','எப்படி','என்ன','வழிகாட்டி'],
    home:   ['ஹோம்','டாஷ்போர்ட்','திரும்பு'],
  },
};

const NAV_ACTIONS: Record<string, string> = {
  send:   '/send-parcel',
  track:  '/user-dashboard',
  wallet: '/user-dashboard',
  porter: '/porter-dashboard',
  home:   '/user-dashboard',
};

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class ChatbotComponent implements OnInit, AfterViewChecked {

  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;

  isOpen      = false;
  isTyping    = false;
  lang: Lang  = 'en';
  inputText   = '';
  messages: Message[] = [];
  pendingNav: string | null = null;
  unread      = 1; // greeting counts as unread

  readonly langs: { code: Lang; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हि' },
    { code: 'te', label: 'తె' },
    { code: 'ta', label: 'த' },
  ];

  get ui()           { return UI[this.lang]; }
  get quickReplies() { return QUICK_REPLIES[this.lang]; }

  constructor(
    private router: Router,
    private cdr:    ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    // Push greeting after a short delay
    setTimeout(() => {
      this.pushBot(GREETINGS[this.lang]);
    }, 600);
  }

  ngAfterViewChecked(): void {
    this.scrollBottom();
  }

  /* ── Open/close ── */
  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) { this.unread = 0; }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.isOpen = false; }

  /* ── Language switch ── */
  switchLang(l: Lang): void {
    if (l === this.lang) return;
    this.lang     = l;
    this.messages = [];
    this.unread   = 1;
    setTimeout(() => this.pushBot(GREETINGS[this.lang]), 300);
  }

  /* ── Send message ── */
  send(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.inputText = '';
    this.pushUser(text);
    const intent = this.detectIntent(text);
    this.respond(intent);
  }

  onQuickReply(action: string): void {
    const label = this.quickReplies.find(q => q.action === action)?.label ?? action;
    this.pushUser(label);
    this.respond(action);
  }

  /* ── Intent detection ── */
  private detectIntent(text: string): string {
    const lower = text.toLowerCase();
    const kws   = KEYWORDS[this.lang];
    for (const [intent, words] of Object.entries(kws)) {
      if (words.some(w => lower.includes(w))) return intent;
    }
    return 'default';
  }

  /* ── Respond ── */
  private respond(intent: string): void {
    this.isTyping = true;
    this.cdr.detectChanges();

    const delay = 800 + Math.random() * 400;
    setTimeout(() => {
      this.isTyping    = false;
      const text       = RESPONSES[this.lang][intent] ?? RESPONSES[this.lang]['default'];
      this.pendingNav  = NAV_ACTIONS[intent] ?? null;
      this.pushBot(text);
    }, delay);
  }

  /* ── Navigate ── */
  navigate(): void {
    if (!this.pendingNav) return;
    const route = this.pendingNav;
    this.pendingNav = null;
    this.isOpen     = false;
    this.router.navigate([route]);
  }

  /* ── Helpers ── */
  private pushBot(text: string): void {
    this.messages.push({ from: 'bot', text, time: this.now() });
    if (!this.isOpen) this.unread++;
    this.cdr.detectChanges();
  }

  private pushUser(text: string): void {
    this.messages.push({ from: 'user', text, time: this.now() });
    this.cdr.detectChanges();
  }

  private now(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollBottom(): void {
    if (!this.chatBody?.nativeElement) return;
    const el = this.chatBody.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  formatText(text: string): string {
    return text.replace(/\n/g, '<br>');
  }

  getNavLabel(): string {
    const labels: Record<Lang, Record<string, string>> = {
      en: { '/send-parcel': '📦 Go to Send Parcel', '/user-dashboard': '🏠 Go to Dashboard', '/porter-dashboard': '🚴 Open Porter Mode' },
      hi: { '/send-parcel': '📦 पार्सल पेज खोलें', '/user-dashboard': '🏠 डैशबोर्ड खोलें', '/porter-dashboard': '🚴 पोर्टर मोड खोलें' },
      te: { '/send-parcel': '📦 పార్సెల్ పేజీ', '/user-dashboard': '🏠 డ్యాష్‌బోర్డ్', '/porter-dashboard': '🚴 పోర్టర్ మోడ్' },
      ta: { '/send-parcel': '📦 பார்சல் பக்கம்', '/user-dashboard': '🏠 டாஷ்போர்ட்', '/porter-dashboard': '🚴 போர்டர் மோட்' },
    };
    return labels[this.lang][this.pendingNav ?? ''] ?? '➡️ Go';
  }
}
