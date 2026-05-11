# Судоку

Коротко: это игровая веб-платформа для судоку на Next.js и TypeScript. Мы сделали ежедневные и свободные партии, удобную доску с заметками и откатом хода, ИИ-подсказки, профиль игрока, XP/ранги, рейтинг, магазин алмазов со Stripe Checkout, Diamond-подписку, косметику и PvP-матчи с другом по ссылке.

Для кого: для игроков, которым хочется не просто решить одну головоломку, а возвращаться каждый день, видеть прогресс, сравнивать результаты, открывать оформление профиля и играть с другом.

Почему это ценно: классическое судоку превращается в живой продукт с понятной прогрессией, безопасной оплатой, наградами и социальным режимом. Проект уже готов как основа для деплоя на Vercel и дальнейшего развития в полноценную соревновательную платформу.

## Возможности

- Судоку-доска с проверкой, заметками, откатом хода, клавиатурой и сохранением ежедневной партии.
- ИИ-подсказки с объяснениями для выбранной клетки и лимитом бесплатных подсказок.
- Премиум-режим с безлимитными подсказками, темами доски и режимом орнаментов.
- Алмазы как игровая валюта: награды за прогресс, косметика и магазин алмазов.
- Stripe Checkout для Diamond-подписки за 2 500 тг/месяц и разовых наборов алмазов.
- Webhook `checkout.session.completed` для серверного начисления покупок.
- Прогрессия игрока: XP, уровни, Bronze/Silver/Gold ранги и достижения.
- Косметическая кастомизация: паки цифр, темы доски и оформление профиля.
- Профиль игрока с аватаром, страной, городом, статистикой, титулом и рейтингом.
- PvP-комнаты по ссылке: готовность двух игроков, одинаковая доска, прогресс друга и визуальные саботажи.
- Городской и всемирный рейтинг.
- Набор тестов для экономики, подписки, Stripe fulfillment, PvP-логики, рейтинга, онбординга, орнаментов, серии дней и подсказок.

## Локальный запуск

```bash
npm install
npm run dev
```

Открой `http://localhost:3000`.

## Проверки

```bash
npm test
npm run lint
npm run build
```

## Переменные окружения

Реальные API-ключи и токены не хранятся в Git. `.env.local` уже добавлен в `.gitignore`, поэтому секреты не попадут в репозиторий.

После скачивания проекта скопируй шаблон:

```bash
cp .env.example .env.local
```

Заполни `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe Checkout
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_SUDOKU_PASS_PRICE_ID=...
STRIPE_DIAMOND_PRICE_ID=...
STRIPE_DIAMOND_STARTER_PRICE_ID=...
STRIPE_DIAMOND_SMALL_PRICE_ID=...
STRIPE_DIAMOND_MEDIUM_PRICE_ID=...
STRIPE_DIAMOND_LARGE_PRICE_ID=...

# Обязательно на Vercel для рейтинга и PvP-комнат
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Stripe webhooks

Checkout возвращает игрока на:

```bash
http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}
```

Webhook принимает завершённые оплаты на:

```bash
http://localhost:3000/api/stripe/webhook
```

Для локальной разработки запусти Stripe CLI в отдельном терминале:

```bash
stripe listen --events checkout.session.completed --forward-to localhost:3000/api/stripe/webhook
```

CLI напечатает `whsec_...`; вставь это значение в `STRIPE_WEBHOOK_SECRET` в `.env.local` и перезапусти dev-сервер. В Stripe Dashboard для production добавь endpoint `https://your-domain.com/api/stripe/webhook` и событие `checkout.session.completed`.

## Vercel и PvP

Для Vercel добавь все переменные окружения из `.env.local` в Project Settings -> Environment Variables. `.env.local` специально находится в `.gitignore`: секреты нельзя отправлять в GitHub. Секреты должны быть только без префикса `NEXT_PUBLIC_`, кроме `NEXT_PUBLIC_SITE_URL`.

PvP-комнаты и рейтинг локально пишутся в `.data`, но на Vercel файловая система не подходит для постоянного состояния. Без `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` друг не сможет стабильно подключиться к комнате, а дневной результат не сохранится в рейтинг. Для нормальной работы на деплое подключи Supabase и создай таблицы:

```sql
create table if not exists leaderboard_entries (
  id text primary key,
  player_id text,
  name text,
  city text,
  country text,
  country_code text,
  avatar_url text,
  icon text,
  date text,
  time integer,
  mistakes integer,
  hints_used integer,
  accuracy integer,
  score integer,
  created_at timestamptz
);

create table if not exists pvp_rooms (
  code text primary key,
  room jsonb not null,
  updated_at timestamptz default now()
);
```

`SUPABASE_SERVICE_ROLE_KEY` используется только на сервере в API routes. Не добавляй его в клиентский код и не называй переменную через `NEXT_PUBLIC_`.
