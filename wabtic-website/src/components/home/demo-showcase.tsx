import React from 'react';
import { Star } from 'lucide-react';

export function DemoShowcase() {
  const testimonials = [
    {
      quote: '"Wabtic completely transformed how we handle customer inquiries. The automated workflows saved us over 40 hours a week."',
      name: 'Sarah Jenkins',
      title: 'Head of Support, TechFlow',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    },
    {
      quote: '"The broadcast feature is incredible. Deliverability is near 100%, and the analytics help us iterate on our messaging quickly."',
      name: 'David Chen',
      title: 'Marketing Director, GrowthCo',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      quote: '"Setting up custom AI responses was surprisingly easy. It integrates seamlessly into our existing stack. Highly recommend."',
      name: 'Elena Rodriguez',
      title: 'Operations Lead, Veloce',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }
  ];

  return (
    <section className="w-full bg-[#eaf5fe] dark:bg-[#111b21] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12">
        <h2 className="text-3xl font-extrabold text-[#131d23] dark:text-white text-center tracking-tight">
          Loved by Support & Marketing Teams
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((card, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#202c33] p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col gap-4"
            >
              <div className="flex gap-1 text-[#25d366]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-grow font-normal">
                {card.quote}
              </p>
              
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <img
                  src={card.avatar}
                  alt={card.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <p className="font-bold text-xs text-[#131d23] dark:text-white">{card.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{card.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
