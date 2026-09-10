import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Sparkles, Check } from 'lucide-react';

export function QrGeneratorComponent() {
  const [targetUrl, setTargetUrl] = useState('https://wa.me/14155552671?text=Hello%20Wabtic%20Team!');
  const [fgColor, setFgColor] = useState('#059669');
  const [bgColor, setBgColor] = useState('#ffffff');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && targetUrl) {
      QRCode.toCanvas(canvasRef.current, targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      }, (error) => {
        if (error) console.error('QR code generation error:', error);
      });
    }
  }, [targetUrl, fgColor, bgColor]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'whatsapp-qr-code.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/25">
          <QrCode className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Custom WhatsApp QR Code Generator</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate high-resolution scannable QR codes for print marketing and product packaging</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Settings Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              WhatsApp Link / URL
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                QR Dots Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 uppercase">{fgColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 uppercase">{bgColor}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {copied ? 'Downloaded PNG!' : 'Download High-Res PNG'}
            </button>
          </div>
        </div>

        {/* QR Code Canvas Preview */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
          <div className="p-3 bg-white rounded-2xl shadow-xl">
            <canvas ref={canvasRef} className="max-w-full rounded-lg" />
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Ready for Print & Web
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Scannable by iOS Camera, Android Camera, & WhatsApp app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
