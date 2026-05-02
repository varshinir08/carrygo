import {
  Component, OnInit, AfterViewChecked, ViewChild,
  ElementRef, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    { label: '❓ Help',             action: 'help' },
  ],
  hi: [
    { label: '📦 पार्सल भेजें',    action: 'send' },
    { label: '📋 डिलीवरी ट्रैक करें', action: 'track' },
    { label: '💳 वॉलेट',          action: 'wallet' },
    { label: '❓ सहायता',          action: 'help' },
  ],
  te: [
    { label: '📦 పార్సెల్ పంపు',    action: 'send' },
    { label: '📋 డెలివరీ ట్రాక్',  action: 'track' },
    { label: '💳 వాలెట్',          action: 'wallet' },
    { label: '❓ సహాయం',           action: 'help' },
  ],
  ta: [
    { label: '📦 பார்சல் அனுப்பு',  action: 'send' },
    { label: '📋 டெலிவரி தடம்',    action: 'track' },
    { label: '💳 வாலட்',           action: 'wallet' },
    { label: '❓ உதவி',            action: 'help' },
  ],
};

const RESPONSES: Record<Lang, Record<string, string>> = {
  en: {
    send:   "📦 Steps to send a parcel:\n\n1. Click 'Send a Parcel' on your dashboard\n2. Enter the pickup address and drop-off address\n3. Fill in parcel details (weight, description)\n4. Select a preferred delivery time slot\n5. Review the details and confirm\n6. Pay using your CarryGo Wallet\n\nA commuter will be assigned and your parcel will be picked up!",
    track:  "📋 Steps to track your deliveries:\n\n1. Open your dashboard\n2. Click on 'My Deliveries' in the sidebar\n3. You'll see a list of all your orders\n4. Each order shows its current live status\n5. Active deliveries display real-time updates\n6. You'll also receive notifications for every status change",
    wallet: "💳 Steps to manage your wallet:\n\n1. Open your dashboard\n2. Click on 'Wallet' in the sidebar\n3. Your current balance is shown at the top\n4. To add money: click 'Add Money' and enter the amount\n5. Choose UPI or Card as payment method\n6. Complete the payment — your balance updates instantly\n7. Scroll down to view your full transaction history",
    help:   "❓ Here's what I can help with:\n\n📦 Send a Parcel — steps to book a delivery\n📋 Track Delivery — how to check your order status\n💳 Wallet — adding money and viewing transactions\n\nJust type your question or tap a quick reply below!",
    home:   "🏠 To go to your home dashboard:\n\n1. Click the CarryGo logo at the top of the page\n2. Or click 'Home' or 'Dashboard' in the navigation menu\n3. You'll be taken back to your main dashboard",
    default:"I didn't quite understand that 🤔\n\nYou can ask me about:\n• Sending a parcel\n• Tracking a delivery\n• Your wallet\n\nOr tap one of the quick reply buttons below!",
  },
  hi: {
    send:   "📦 पार्सल भेजने के चरण:\n\n1. डैशबोर्ड पर 'पार्सल भेजें' पर क्लिक करें\n2. पिकअप और ड्रॉप पता दर्ज करें\n3. पार्सल की जानकारी भरें (वजन, विवरण)\n4. डिलीवरी का समय चुनें\n5. विवरण की समीक्षा करें और पुष्टि करें\n6. CarryGo Wallet से भुगतान करें\n\nएक कमाईकर्ता को असाइन किया जाएगा!",
    track:  "📋 डिलीवरी ट्रैक करने के चरण:\n\n1. अपना डैशबोर्ड खोलें\n2. साइडबार में 'मेरी डिलीवरी' पर क्लिक करें\n3. सभी ऑर्डर की सूची दिखेगी\n4. प्रत्येक ऑर्डर की लाइव स्थिति देखें\n5. सक्रिय डिलीवरी रियल-टाइम अपडेट दिखाती हैं\n6. स्थिति बदलने पर सूचनाएं मिलेंगी",
    wallet: "💳 वॉलेट प्रबंधन के चरण:\n\n1. डैशबोर्ड खोलें\n2. साइडबार में 'वॉलेट' पर क्लिक करें\n3. शीर्ष पर वर्तमान बैलेंस दिखेगा\n4. पैसे जोड़ने के लिए 'पैसे जोड़ें' पर क्लिक करें\n5. UPI या कार्ड से भुगतान करें\n6. बैलेंस तुरंत अपडेट हो जाएगा\n7. नीचे स्क्रॉल करके लेनदेन इतिहास देखें",
    help:   "❓ मैं इन विषयों में मदद कर सकता हूँ:\n\n📦 पार्सल भेजना\n📋 डिलीवरी ट्रैक करना\n💳 वॉलेट प्रबंधन\n\nकोई प्रश्न टाइप करें या नीचे बटन दबाएं!",
    home:   "🏠 होम डैशबोर्ड पर जाने के लिए:\n\n1. पेज के शीर्ष पर CarryGo लोगो पर क्लिक करें\n2. या नेविगेशन में 'होम' पर क्लिक करें\n3. आप मुख्य डैशबोर्ड पर पहुंच जाएंगे",
    default:"मुझे समझ नहीं आया 🤔\n\nआप इन विषयों पर पूछ सकते हैं:\n• पार्सल भेजना\n• डिलीवरी ट्रैक करना\n• वॉलेट\n\nया नीचे दिए बटन में से कोई दबाएं!",
  },
  te: {
    send:   "📦 పార్సెల్ పంపే దశలు:\n\n1. డాష్‌బోర్డ్‌లో 'పార్సెల్ పంపు' పై క్లిక్ చేయండి\n2. పికప్ మరియు డ్రాప్ చిరునామా నమోదు చేయండి\n3. పార్సెల్ వివరాలు నింపండి (బరువు, వివరణ)\n4. డెలివరీ సమయాన్ని ఎంచుకోండి\n5. వివరాలు సమీక్షించి నిర్ధారించండి\n6. CarryGo వాలెట్ ద్వారా చెల్లించండి\n\nఒక కమ్యూటర్ కేటాయించబడతారు!",
    track:  "📋 డెలివరీ ట్రాక్ చేసే దశలు:\n\n1. మీ డాష్‌బోర్డ్ తెరవండి\n2. సైడ్‌బార్‌లో 'నా డెలివరీలు' పై క్లిక్ చేయండి\n3. మీ అన్ని ఆర్డర్ల జాబితా కనిపిస్తుంది\n4. ప్రతి ఆర్డర్ యొక్క లైవ్ స్థితి చూడండి\n5. యాక్టివ్ డెలివరీలు రియల్-టైమ్ అప్‌డేట్‌లు చూపిస్తాయి\n6. స్థితి మారినప్పుడు నోటిఫికేషన్‌లు వస్తాయి",
    wallet: "💳 వాలెట్ నిర్వహణ దశలు:\n\n1. డాష్‌బోర్డ్ తెరవండి\n2. సైడ్‌బార్‌లో 'వాలెట్' పై క్లిక్ చేయండి\n3. పైన ప్రస్తుత బ్యాలెన్స్ కనిపిస్తుంది\n4. డబ్బు జోడించడానికి 'డబ్బు జోడించు' పై క్లిక్ చేయండి\n5. UPI లేదా కార్డ్ ఎంచుకోండి\n6. చెల్లింపు పూర్తి చేయండి — బ్యాలెన్స్ వెంటనే అప్‌డేట్ అవుతుంది\n7. లావాదేవీ చరిత్రను చూడటానికి క్రిందికి స్క్రోల్ చేయండి",
    help:   "❓ నేను ఈ విషయాలలో సహాయం చేయగలను:\n\n📦 పార్సెల్ పంపడం\n📋 డెలివరీ ట్రాక్ చేయడం\n💳 వాలెట్ నిర్వహణ\n\nమీ ప్రశ్న టైప్ చేయండి లేదా దిగువ బటన్ నొక్కండి!",
    home:   "🏠 హోమ్ డాష్‌బోర్డ్‌కి వెళ్ళడానికి:\n\n1. పేజీ పైభాగంలో CarryGo లోగో పై క్లిక్ చేయండి\n2. లేదా నావిగేషన్‌లో 'హోమ్' పై క్లిక్ చేయండి\n3. మీరు మీ ప్రధాన డాష్‌బోర్డ్‌కి చేరుకుంటారు",
    default:"నాకు అర్థం కాలేదు 🤔\n\nమీరు ఇవి అడగవచ్చు:\n• పార్సెల్ పంపడం\n• డెలివరీ ట్రాక్ చేయడం\n• వాలెట్\n\nలేదా దిగువ బటన్లలో ఒకటి నొక్కండి!",
  },
  ta: {
    send:   "📦 பார்சல் அனுப்பும் படிகள்:\n\n1. டாஷ்போர்டில் 'பார்சல் அனுப்பு' என்பதை கிளிக் செய்யவும்\n2. பிக்அப் மற்றும் டிராப் முகவரி உள்ளிடவும்\n3. பார்சல் விவரங்கள் நிரப்பவும் (எடை, விவரம்)\n4. டெலிவரி நேரத்தை தேர்வு செய்யவும்\n5. விவரங்களை சரிபார்த்து உறுதிப்படுத்தவும்\n6. CarryGo Wallet மூலம் பணம் செலுத்தவும்\n\nஒரு கமியூட்டர் ஒதுக்கப்படுவார்!",
    track:  "📋 டெலிவரி கண்காணிக்கும் படிகள்:\n\n1. உங்கள் டாஷ்போர்டை திறக்கவும்\n2. சைட்பாரில் 'என் டெலிவரிகள்' என்பதை கிளிக் செய்யவும்\n3. உங்கள் அனைத்து ஆர்டர்களும் காட்டப்படும்\n4. ஒவ்வொரு ஆர்டரின் நேரடி நிலையை பாருங்கள்\n5. செயலில் உள்ள டெலிவரிகள் நிகழ்நேர புதுப்பிப்புகள் காட்டும்\n6. நிலை மாறும்போது அறிவிப்புகள் வரும்",
    wallet: "💳 வாலட் நிர்வாகிக்கும் படிகள்:\n\n1. டாஷ்போர்டை திறக்கவும்\n2. சைட்பாரில் 'வாலட்' என்பதை கிளிக் செய்யவும்\n3. மேலே தற்போதைய இருப்பு காட்டப்படும்\n4. பணம் சேர்க்க 'பணம் சேர்' என்பதை கிளிக் செய்யவும்\n5. UPI அல்லது கார்டு தேர்வு செய்யவும்\n6. பணம் செலுத்தினால் இருப்பு உடனே புதுப்பிக்கப்படும்\n7. பரிவர்த்தனை வரலாற்றை கீழே உருட்டி பாருங்கள்",
    help:   "❓ நான் இந்த விஷயங்களில் உதவலாம்:\n\n📦 பார்சல் அனுப்புதல்\n📋 டெலிவரி தடம்\n💳 வாலட் நிர்வாகம்\n\nகேள்வி தட்டச்சு செய்யவும் அல்லது கீழே உள்ள பட்டனை அழுத்துங்கள்!",
    home:   "🏠 முகப்பு டாஷ்போர்டுக்கு செல்ல:\n\n1. பக்கத்தின் மேலே CarryGo லோகோவை கிளிக் செய்யவும்\n2. அல்லது வழிசெலுத்தலில் 'முகப்பு' என்பதை கிளிக் செய்யவும்\n3. உங்கள் முக்கிய டாஷ்போர்டுக்கு திரும்புவீர்கள்",
    default:"எனக்கு புரியவில்லை 🤔\n\nநீங்கள் இவற்றை கேட்கலாம்:\n• பார்சல் அனுப்புவது\n• டெலிவரி தடமறிவது\n• வாலட்\n\nகீழே உள்ள பட்டன்களில் ஒன்றை அழுத்துங்கள்!",
  },
};

/* ── Keywords for intent detection ── */
const KEYWORDS: Record<Lang, Record<string, string[]>> = {
  en: {
    send:   ['send','parcel','package','book','deliver','booking'],
    track:  ['track','status','where','delivery','deliveries','order','orders','my order'],
    wallet: ['wallet','balance','money','pay','payment','add money','recharge'],
    help:   ['help','how','what','guide','assist','support'],
    home:   ['home','dashboard','main','back'],
  },
  hi: {
    send:   ['भेजो','पार्सल','पैकेज','बुक','डिलीवरी'],
    track:  ['ट्रैक','स्थिति','कहाँ','ऑर्डर','मेरे ऑर्डर'],
    wallet: ['वॉलेट','बैलेंस','पैसे','भुगतान','रिचार्ज'],
    help:   ['मदद','कैसे','क्या','सहायता'],
    home:   ['होम','डैशबोर्ड','मुख्य'],
  },
  te: {
    send:   ['పంపు','పార్సెల్','బుక్','డెలివరీ'],
    track:  ['ట్రాక్','స్థితి','ఎక్కడ','ఆర్డర్','నా ఆర్డర్లు'],
    wallet: ['వాలెట్','బ్యాలెన్స్','డబ్బు','చెల్లింపు'],
    help:   ['సహాయం','ఎలా','ఏమిటి','గైడ్'],
    home:   ['హోమ్','డ్యాష్‌బోర్డ్','వెనక్కి'],
  },
  ta: {
    send:   ['அனுப்பு','பார்சல்','புக்','டெலிவரி'],
    track:  ['தடம்','நிலை','எங்கே','ஆர்டர்'],
    wallet: ['வாலட்','பேலன்ஸ்','பணம்','கட்டணம்'],
    help:   ['உதவி','எப்படி','என்ன','வழிகாட்டி'],
    home:   ['ஹோம்','டாஷ்போர்ட்','திரும்பு'],
  },
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
  unread      = 1;

  readonly langs: { code: Lang; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हि' },
    { code: 'te', label: 'తె' },
    { code: 'ta', label: 'த' },
  ];

  get ui()           { return UI[this.lang]; }
  get quickReplies() { return QUICK_REPLIES[this.lang]; }

  constructor(private cdr: ChangeDetectorRef) {}

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
      this.isTyping = false;
      const text    = RESPONSES[this.lang][intent] ?? RESPONSES[this.lang]['default'];
      this.pushBot(text);
    }, delay);
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
}
