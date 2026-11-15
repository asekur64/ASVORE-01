import { useParams } from 'react-router-dom';
import { Facebook, Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function ContentPage({ page }: { page: 'about' | 'contact' | 'faq' | 'policy' }) {
  const { type } = useParams();
  const { lang, siteSettings } = useApp();

  if (page === 'about') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">ASVORE</p>
        <h1 className="font-display text-4xl font-semibold text-[#111113]">
          {lang === 'bn' ? 'আসভোর সম্পর্কে' : 'About ASVORE'}
        </h1>
        <p className="text-base text-[#5C5B57] leading-relaxed">
          {lang === 'bn' ? siteSettings.aboutBn : siteSettings.aboutEn}
        </p>
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">ASVORE</p>
          <h1 className="font-display text-4xl font-semibold text-[#111113]">
            {lang === 'bn' ? 'যোগাযোগ করুন' : 'Contact Studio'}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white border border-[#111113]/10 p-8 text-sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#B89352] mt-1" />
              <div>
                <p className="font-semibold">{lang === 'bn' ? 'ফোন / হোয়াটসঅ্যাপ' : 'Phone'}</p>
                <p className="text-[#5C5B57] tabular-nums">{siteSettings.contactNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#B89352] mt-1" />
              <div>
                <p className="font-semibold">{lang === 'bn' ? 'ঠিকানা' : 'Studio Address'}</p>
                <p className="text-[#5C5B57]">{lang === 'bn' ? siteSettings.addressBn : siteSettings.addressEn}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#B89352] mt-1" />
              <div>
                <p className="font-semibold">{lang === 'bn' ? 'ইমেইল' : 'Email'}</p>
                <p className="text-[#5C5B57]">{siteSettings.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Facebook className="w-4 h-4 text-[#B89352] mt-1" />
              <div>
                <p className="font-semibold">Facebook</p>
                <a href={siteSettings.facebookUrl} target="_blank" rel="noreferrer" className="underline text-[#5C5B57]">
                  Asvore
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'faq') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">ASVORE</p>
        <h1 className="font-display text-4xl font-semibold text-[#111113]">
          {lang === 'bn' ? 'সাধারণ জিজ্ঞাসা (FAQ)' : 'Frequently Asked Questions'}
        </h1>
        <div className="divide-y divide-[#111113]/10 bg-white border border-[#111113]/10">
          {siteSettings.faqs.map((f) => (
            <div key={f.id} className="p-6 space-y-2">
              <h2 className="text-base font-semibold text-[#111113]">
                {lang === 'bn' ? f.questionBn : f.questionEn}
              </h2>
              <p className="text-sm text-[#5C5B57] leading-relaxed">
                {lang === 'bn' ? f.answerBn : f.answerEn}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const policyMap = {
    privacy: {
      titleEn: 'Privacy Policy',
      titleBn: 'প্রাইভেসি পলিসি',
      bodyEn: siteSettings.policies.privacyEn,
      bodyBn: siteSettings.policies.privacyBn,
    },
    terms: {
      titleEn: 'Terms & Conditions',
      titleBn: 'শর্তাবলী',
      bodyEn: siteSettings.policies.termsEn,
      bodyBn: siteSettings.policies.termsBn,
    },
    return: {
      titleEn: 'Return & Refund Policy',
      titleBn: 'রিটার্ন ও রিফান্ড নীতিমালা',
      bodyEn: siteSettings.policies.returnEn,
      bodyBn: siteSettings.policies.returnBn,
    },
    shipping: {
      titleEn: 'Shipping Policy',
      titleBn: 'শিপিং ও ডেলিভারি নীতিমালা',
      bodyEn: siteSettings.policies.shippingEn,
      bodyBn: siteSettings.policies.shippingBn,
    },
  };
  const selected = policyMap[(type as keyof typeof policyMap) || 'privacy'] || policyMap.privacy;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B89352]">ASVORE</p>
      <h1 className="font-display text-4xl font-semibold text-[#111113]">
        {lang === 'bn' ? selected.titleBn : selected.titleEn}
      </h1>
      <div className="bg-white border border-[#111113]/10 p-8 text-sm text-[#5C5B57] leading-relaxed">
        {lang === 'bn' ? selected.bodyBn : selected.bodyEn}
      </div>
    </div>
  );
}
