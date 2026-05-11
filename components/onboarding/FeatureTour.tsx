"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Plan } from "@/types";

const TOUR_KEY = "sl_feature_tour_v1";

interface FeatureTourProps {
  mode: "daily" | "free";
  plan: Plan;
}

interface TourStep {
  eyebrow: string;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
}

export function FeatureTour({ mode, plan }: FeatureTourProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const premium = plan === "diamond" || plan === "sudoku-pass";

  const steps = useMemo<TourStep[]>(
    () => [
      {
        eyebrow: "Задания",
        title: "Пасс качается от обычной игры",
        body: "Решай партии, закрывай ежедневные задания и забирай 30 дней подарков: отдельно бесплатный и платный трек.",
        href: "/pass",
        linkLabel: "Посмотреть призы"
      },
      {
        eyebrow: "Рейтинг",
        title: mode === "daily" ? "Финиш появится в рейтинге" : "Тренировка готовит к рейтингу",
        body:
          mode === "daily"
            ? "Когда закончишь ежедневный судоку, место в рейтинге появится в правой панели и в таблице лидеров."
            : "В свободной игре можно спокойно потренироваться, а за рейтингом заходи в ежедневный судоку."
      },
      {
        eyebrow: "Подсказки",
        title: premium ? "Подсказки без лимита" : "3 бесплатные подсказки в день",
        body: premium
          ? "Пасс открывает ИИ-тренера без дневного лимита, поэтому можно разбирать сложные места без паузы."
          : "Без Пасса доступно 3 ИИ-подсказки в день. Если лимит закончится, Пасс откроет подсказки без ограничений."
      },
      {
        eyebrow: "PvP",
        title: "Играй с другом на арене",
        body: "В PvP можно создать комнату, отправить код другу и мешать друг другу эффектами арены.",
        href: "/arena",
        linkLabel: "Открыть PvP"
      }
    ],
    [mode, premium]
  );

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    setOpen(localStorage.getItem(TOUR_KEY) !== "done");
  }, []);

  if (!mounted || !open) return null;

  const step = steps[stepIndex];
  const last = stepIndex === steps.length - 1;

  function finish() {
    localStorage.setItem(TOUR_KEY, "done");
    setOpen(false);
  }

  function next() {
    if (last) {
      finish();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <aside className="feature-tour" aria-live="polite" aria-label="Короткое обучение">
      <div className="feature-tour-top">
        <span>{step.eyebrow}</span>
        <button type="button" onClick={finish} aria-label="Закрыть обучение">
          x
        </button>
      </div>
      <strong>{step.title}</strong>
      <p>{step.body}</p>
      <div className="feature-tour-progress" aria-hidden>
        {steps.map((item, index) => (
          <span key={item.eyebrow} className={index === stepIndex ? "feature-tour-dot-active" : ""} />
        ))}
      </div>
      <div className="feature-tour-actions">
        {step.href ? (
          <Link href={step.href} onClick={finish}>
            {step.linkLabel}
          </Link>
        ) : (
          <button type="button" className="feature-tour-skip" onClick={finish}>
            Пропустить
          </button>
        )}
        <button type="button" className="feature-tour-next" onClick={next}>
          {last ? "Понятно" : "Далее"}
        </button>
      </div>
    </aside>
  );
}
