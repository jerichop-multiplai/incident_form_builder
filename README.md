# GoTeam Incident Report Generator

A modern web-based application for creating standardized corporate incident reports with AI-powered text enhancement. This application generates professional DOCX documents for incident documentation and management.

## Features

- **User Authentication**: Secure login via n8n webhook integration
- **AI-Powered Text Enhancement**: Automatically improve report writing with AI assistance
- **Employee Lookup**: Quick access to employee details via n8n integration
- **Real-time Preview**: Live preview of the incident report as you type
- **DOCX Generation**: Client-side document generation using the `docx` library
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Markdown Support**: Rich text formatting with markdown in narrative fields

## Tech Stack

- **Frontend**: Next.js 16 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Document Generation**: `docx` library for Word document creation
- **Backend Integration**: n8n workflows for authentication and AI services
- **State Management**: React hooks with session storage
- **File Handling**: `file-saver` for document downloads

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- n8n instance for backend services

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd goteam_incident_form_builder/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your n8n webhook URLs:
   ```bash
   N8N_AUTH_WEBHOOK_URL=https://your-n8n-instance.com/webhook/auth
   N8N_EMPLOYEE_LOOKUP_URL=https://your-n8n-instance.com/webhook/employee
   N8N_AI_ENHANCE_URL=https://your-n8n-instance.com/webhook/ai-enhance
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Authentication
1. Visit the login page
2. Enter your User ID and Email
3. The system authenticates via n8n webhook

### Creating an Incident Report

1. **General Information**: Set the date prepared
2. **Employee Details**: Look up the employee involved using their ID
3. **Incident Description**:
   - What: Brief summary
   - Where: Location of incident
   - When: Date and time
   - Details: Full narrative (AI-enhanced)
   - Optional: Findings and policy violations
4. **Attachments**: Add supporting documents or links
5. **Impact Assessment**: Describe who was affected and how
6. **Signatories**: Select the reporting and attesting parties

### AI Text Enhancement
Click the "AI Enhance" button on any text field to automatically improve grammar and formatting using AI.

### Document Generation
Once all required fields are complete, download the professional DOCX document directly to your device.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── form/          # Main incident report form
│   │   └── login/         # Authentication page
│   ├── components/        # Reusable UI components
│   └── lib/               # Utility functions and DOCX generator
├── public/                # Static assets
└── package.json
```

## n8n Integration

The application integrates with n8n workflows for:

- **Authentication**: User verification
- **Employee Lookup**: Retrieve employee details
- **AI Enhancement**: Text improvement services

See the [Product Requirements Document](./product_requirement_document.md) for detailed API specifications.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Components

- `MarkdownEditor`: Rich text editor with markdown support
- `DocumentPreview`: Live preview of the incident report
- `docx-generator.ts`: DOCX document creation logic

## Deployment

This application is designed for serverless deployment (Vercel, Netlify) since document generation happens client-side without system dependencies.

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary to GoTeam.
