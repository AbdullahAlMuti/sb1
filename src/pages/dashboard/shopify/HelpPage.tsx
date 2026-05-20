import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Send, Check } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'How are product opportunities calculated?',
    answer: 'We analyze daily search volumes across TikTok, Pinterest, and Google Trends, cross-reference them with competitive saturation in ad channels, and calculate estimated supplier costs to yield a unified Opportunity Score from 1 to 100.',
  },
  {
    question: 'How often is the competitor store database updated?',
    answer: 'Competitor stores, estimated monthly revenues, and active app list stack analyses are updated in real-time. New products added to tracked store catalogs are indexed within 4 hours.',
  },
  {
    question: 'What advertising platforms does the Ad Library index?',
    answer: 'Our systems crawl active creative assets, captions, and engagement metrics on TikTok, Facebook Ads Library, and Instagram. We target dropshipping and direct-to-consumer store profiles.',
  },
  {
    question: 'Do I need to connect my live Shopify store to Dropea?',
    answer: 'No. Dropea is a growth research and intelligence suite. You do not need to link your admin portal, install Shopify pixels, or connect APIs to search products, spy on stores, or generate copywriting.',
  },
];

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSent(true);
    setSubject('');
    setMessage('');
    setTimeout(() => setTicketSent(false), 3000);
  };

  return (
    <ShopifyPageShell
      icon={HelpCircle}
      title="Help & Support"
      description="Access our knowledge center, browse common platform FAQs, or open a direct ticket with our support engineers."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Accordion FAQs */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-slate-800 dark:text-slate-250 hover:bg-slate-50/50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal border-t border-slate-100 dark:border-slate-850/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Message support form */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Submit Support Ticket</h3>
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-5 shadow-xs">
            <form onSubmit={handleSendTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-455 uppercase font-semibold">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="How can we help?"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-455 uppercase font-semibold">Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or feedback in detail..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-750 text-white rounded-xl h-10 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Ticket
              </Button>
            </form>

            {ticketSent && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-450 flex-shrink-0" />
                <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold">
                  Ticket submitted! Our engineers will contact you shortly.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </ShopifyPageShell>
  );
}
