'use client';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';

// Slim top banner shown while a company is on its 14-day Free trial, counting
// down the days left. Turns red once the trial has expired. Hidden for paid
// plans and when not signed in.
export default function TrialBanner() {
  const [info, setInfo] = useState(null);
  const { t } = useLang();

  useEffect(() => {
    let active = true;
    fetch('/api/trial').then(r => r.ok ? r.json() : null).then(d => { if (active) setInfo(d); }).catch(() => {});
    return () => { active = false; };
  }, []);

  if (!info || !info.isTrial) return null;

  const expired = info.expired;
  const days = info.daysLeft;

  return (
    <div className={`w-full text-center text-xs md:text-sm py-1.5 px-3 font-medium ${
      expired ? 'bg-octane-red text-white' : 'bg-octane-gold text-octane-black'
    }`}>
      {expired ? (
        <span>
          {t('O período de avaliação terminou.', 'Your trial has ended.')}{' '}
          {t('Contacte o administrador para atualizar o plano.', 'Contact your administrator to upgrade.')}
        </span>
      ) : (
        <span>
          {t('Período de avaliação', 'Trial')}: <b>{days} {days === 1 ? t('dia', 'day') : t('dias', 'days')}</b> {t('restantes', 'left')}
          {' '}&middot;{' '}
          {t('plano Free (até 2 utilizadores e 25 viaturas)', 'Free plan (up to 2 users and 25 vehicles)')}
        </span>
      )}
    </div>
  );
}
