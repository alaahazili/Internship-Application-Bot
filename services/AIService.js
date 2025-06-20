const OpenAI = require('openai');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async generateCoverLetter({ userProfile, internship }) {
        const prompt = `Write a professional, academic-focused cover letter for the following internship application.\n\nUser Profile:\nName: ${userProfile.fullName}\nUniversity: ${userProfile.university}\nMajor: ${userProfile.major}\nGraduation Year: ${userProfile.graduationYear}\n\nInternship:\nTitle: ${internship.title}\nCompany: ${internship.company.name}\nDescription: ${internship.description}\n\nThe letter should be polite, concise, and tailored to the internship. Include a brief mention of relevant skills and motivation.`;
        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant for job applications.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 400
        });
        return response.choices[0].message.content.trim();
    }

    async parseResume(pdfBuffer) {
        // Placeholder: Use OpenAI or another service to extract text/skills from PDF
        // You can use pdf-parse to extract text, then send to OpenAI for analysis
        return 'Resume parsing not implemented yet.';
    }
}

module.exports = AIService; 