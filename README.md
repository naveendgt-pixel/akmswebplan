# Aura Knot Event Management System

Wedding and event management web application for quotations, orders, payments, and reporting.

## Getting Started

1) Create an environment file:

```
copy .env.example .env.local
```

2) Fill in Supabase credentials and the single authorized email:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ALLOWED_EMAIL=
```

3) Run the development server:

```
npm run dev
```

Open http://localhost:3000 in your browser.

## Notes

- Google OAuth is configured via Supabase Auth. Update Supabase settings with your redirect URL.
- PDF and Excel exports are stubbed in the UI and will be wired in the next phase.
