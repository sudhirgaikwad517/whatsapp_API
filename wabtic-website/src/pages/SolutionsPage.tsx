import React from 'react';
import { 
  ShoppingBag, 
  HeartPulse, 
  GraduationCap, 
  Building2, 
  Landmark, 
  Truck, 
  Plane, 
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { NavTab } from '@/types';

interface SolutionsPageProps {
  onNavigate: (tab: NavTab) => void;
}

export function SolutionsPage({ onNavigate }: SolutionsPageProps) {
  const industries = [
    {
      id: 'ecommerce',
      icon: ShoppingBag,
      title: 'E-Commerce & Retail',
      tagline: 'Recover Abandoned Carts & Automate Order Tracking',
      desc: 'Drive repeat purchases by sending personalized WhatsApp promotional broadcasts, instant shipping notifications, COD payment confirmations, and back-in-stock alerts.',
      useCases: [
        'Automated abandoned checkout reminders with 1-click buy buttons',
        'Real-time order confirmation & live tracking links',
        'Back-in-stock & price drop notifications',
        'Customer satisfaction surveys & review requests'
      ]
    },
    {
      id: 'healthcare',
      icon: HeartPulse,
      title: 'Healthcare & Medical Clinics',
      tagline: 'Patient Appointment Reminders & Prescription Alerts',
      desc: 'Streamline patient care workflows by dispatching automated appointment reminders, prescription refill alerts, diagnostic lab report links, and telehealth consult links securely.',
      useCases: [
        'Automated 24h & 2h appointment reminder notifications',
        'Secure patient diagnostic report PDF delivery',
        'Prescription renewal reminders & pharmacy pickup alerts',
        'Doctor availability & clinic location finder chatbot'
      ]
    },
    {
      id: 'education',
      icon: GraduationCap,
      title: 'Education & EdTech',
      tagline: 'Admissions Inquiry Bot & Class Schedule Alerts',
      desc: 'Engage prospective students instantly during admissions, send automated fee payment receipts, publish exam schedule updates, and broadcast parent notifications.',
      useCases: [
        '24/7 Admissions counseling chatbot',
        'Fee deadline reminders & digital receipt generation',
        'Class schedule, exam timetable & campus announcements',
        'Parent-teacher meeting scheduling'
      ]
    },
    {
      id: 'realestate',
      icon: Building2,
      title: 'Real Estate & Property Agencies',
      tagline: 'Instant Property Catalogs & Tour Scheduling',
      desc: 'Qualify buyer leads instantly with interactive WhatsApp property brochures, video virtual walkthroughs, neighborhood map locations, and site visit booking.',
      useCases: [
        'Automated lead qualification flow (Budget, Location, BHK)',
        'Rich media PDF property brochures & floor plans',
        'Instant site visit appointment booking',
        'New project launch broadcast campaigns'
      ]
    },
    {
      id: 'finance',
      icon: Landmark,
      title: 'Finance & Banking',
      tagline: 'High-Security OTP Delivery & Account Alerts',
      desc: 'Deliver bank-grade transactional OTP security codes, real-time credit/debit transaction alerts, loan approval updates, and fraud warning messages with 99.99% reliability.',
      useCases: [
        'Sub-second authentication OTP delivery',
        'Real-time credit/debit transaction notifications',
        'E-statement request & PDF document dispatch',
        'Loan application status tracking'
      ]
    },
    {
      id: 'logistics',
      icon: Truck,
      title: 'Logistics & Supply Chain',
      tagline: 'Driver Notifications & Live Delivery Updates',
      desc: 'Eliminate failed deliveries by providing customers with real-time ETA updates, delivery address confirmation triggers, and driver contact connection links.',
      useCases: [
        'Out-for-delivery notification with live map link',
        'Delivery address confirmation & landmark updates',
        'Proof of delivery image receipt dispatch',
        'Driver & customer chat mask bridge'
      ]
    },
    {
      id: 'travel',
      icon: Plane,
      title: 'Travel & Hospitality',
      tagline: 'Boarding Passes & Hotel Reservation Confirmations',
      desc: 'Enhance guest travel experiences by sending instant PDF boarding passes, hotel check-in QR codes, flight delay updates, and concierge recommendations.',
      useCases: [
        'Interactive flight / train ticket & boarding pass PDF',
        'Hotel check-in confirmation & room key QR codes',
        'Real-time flight gate & delay notifications',
        'Concierge tour booking & dining recommendations'
      ]
    }
  ];

  return (
    <div className="pt-12 pb-20 space-y-16">
      
      {/* Page Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <Sparkles className="w-4 h-4" /> Tailored Playbooks
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#111b21] dark:text-white tracking-tight">
          WhatsApp Solutions <span className="text-[#25D366]">By Industry</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
          Discover specialized WhatsApp Business API workflows engineered for your specific business domain and customer journey.
        </p>
      </section>

      {/* Industry Cards List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {industries.map((ind, i) => (
          <div
            key={ind.id}
            id={ind.id}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all duration-300 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-5 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <ind.icon className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {ind.title}
              </h2>
              <p className="text-sm font-semibold text-emerald-500">{ind.tagline}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {ind.desc}
              </p>
              <button
                onClick={() => onNavigate('demo')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Get {ind.title} Demo <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950/80 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Operational Workflows</h4>
              {ind.useCases.map((uc, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{uc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}
