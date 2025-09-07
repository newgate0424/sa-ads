# SA Ads Dashboard

A modern advertising dashboard built with Next.js 15, featuring user authentication, analytics, and monitoring capabilities.

## Features

- 🔐 **User Authentication** - Registration and login system with NextAuth.js
- 📊 **Analytics Dashboard** - Real-time advertising metrics and insights
- 🖥️ **Admin Panel** - User management and system administration
- 📈 **Monitoring** - System health and performance monitoring
- ⚙️ **Settings** - Customizable user preferences and team settings
- 🎨 **Modern UI** - Built with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL database
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/newgate0424/sa-ads.git
cd sa-ads
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials:
```env
DATABASE_URL="mysql://username:password@host:port/database_name"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL=http://localhost:3000
```

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main application pages
│   └── api/               # API routes
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── prisma/               # Database schema
└── types/                # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Schema

The application uses MySQL with the following main tables:
- `users` - User accounts with authentication
- `sessions` - User session management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support, please contact the development team.
