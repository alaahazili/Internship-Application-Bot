# BotAutoLinkdin - LinkedIn Internship Application Bot

A Node.js application that automates LinkedIn activities for internship applications, including job scraping, application management, and email notifications.

## 🚀 Features

- **LinkedIn Job Scraping**: Automatically scrape internship and job postings from LinkedIn
- **Application Management**: Track and manage internship applications
- **AI-Powered Analysis**: Use OpenAI to analyze job descriptions and match skills
- **Email Notifications**: Automated email notifications for application status
- **User Authentication**: Secure user registration and login system
- **RESTful API**: Complete API for frontend integration
- **Puppeteer Integration**: Web scraping capabilities for dynamic content

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (running locally or cloud instance)
- **Redis** (optional, for caching)
- **Git**

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/alaahazili/Internship-Application-Bot.git
   cd Internship-Application-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/internship-bot

   # JWT Configuration
   JWT_SECRET=your-jwt-secret-here
   JWT_EXPIRES_IN=7d

   # Email Configuration (Gmail)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=Internship Bot <your-email@gmail.com>

   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key-here

   # File Upload Configuration
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=30

   # Security
   BCRYPT_ROUNDS=12
   SESSION_SECRET=your-session-secret-here

   # External Services
   REDIS_URL=redis://localhost:6379
   CLOUDINARY_URL=cloudinary://your-cloudinary-url

   # Monitoring
   SENTRY_DSN=your-sentry-dsn
   LOG_LEVEL=info
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
BotAutoLinkdin/
├── middleware/          # Authentication and error handling middleware
├── models/             # Database models (User, Internship)
├── routes/             # API route handlers
│   ├── ai.js           # AI service routes
│   ├── applications.js # Application management routes
│   ├── auth.js         # Authentication routes
│   ├── emails.js       # Email service routes
│   ├── internships.js  # Internship management routes
│   ├── scraping.js     # Web scraping routes
│   └── users.js        # User management routes
├── services/           # Business logic services
│   ├── AIService.js    # OpenAI integration
│   ├── EmailService.js # Email functionality
│   ├── JobScrapingService.js # LinkedIn scraping
│   └── NotificationService.js # Notification handling
├── public/             # Static files
├── screen/             # Screenshots and documentation
├── server.js           # Main server file
└── package.json        # Dependencies and scripts
```

## 🔧 Configuration

### Required Services

1. **MongoDB**: Set up a MongoDB database and update `MONGODB_URI` in your `.env` file
2. **OpenAI API**: Get an API key from [OpenAI](https://platform.openai.com/) and add it to `OPENAI_API_KEY`
3. **Gmail**: For email notifications, set up an app password in your Gmail account

### Optional Services

- **Redis**: For caching and session storage
- **Cloudinary**: For file uploads and image storage
- **Sentry**: For error monitoring and logging

## 🚀 Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### API Endpoints

The application provides the following API endpoints:

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### Internships
- `GET /api/internships` - Get all internships
- `POST /api/internships` - Create new internship
- `GET /api/internships/:id` - Get specific internship
- `PUT /api/internships/:id` - Update internship
- `DELETE /api/internships/:id` - Delete internship

#### Applications
- `GET /api/applications` - Get user applications
- `POST /api/applications` - Submit new application
- `PUT /api/applications/:id` - Update application status

#### Scraping
- `POST /api/scraping/linkedin` - Scrape LinkedIn jobs
- `GET /api/scraping/status` - Get scraping status

#### AI Services
- `POST /api/ai/analyze-job` - Analyze job description
- `POST /api/ai/generate-cover-letter` - Generate cover letter

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- Environment variable protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



## ⚠️ Disclaimer

This application is for educational purposes. Please ensure you comply with LinkedIn's Terms of Service and respect rate limits when scraping data. The developers are not responsible for any misuse of this application.

