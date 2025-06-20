const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
    // Basic Information
    title: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        website: String,
        linkedinUrl: String,
        industry: String,
        size: {
            type: String,
            enum: ['startup', 'small', 'medium', 'large', 'enterprise']
        },
        founded: Number,
        description: String,
        logo: String
    },
    
    // Location & Work Type
    location: {
        city: String,
        state: String,
        country: String,
        fullAddress: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    workType: {
        type: String,
        enum: ['remote', 'onsite', 'hybrid'],
        required: true
    },
    isRemote: {
        type: Boolean,
        default: false
    },
    
    // Duration & Timing
    duration: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,
    applicationDeadline: Date,
    isFlexible: {
        type: Boolean,
        default: false
    },
    
    // Compensation
    compensation: {
        type: {
            type: String,
            enum: ['paid', 'unpaid', 'stipend', 'credit-only', 'commission'],
            required: true
        },
        amount: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        period: {
            type: String,
            enum: ['hourly', 'daily', 'weekly', 'monthly', 'total']
        },
        benefits: [String],
        description: String
    },
    
    // Requirements & Skills
    requirements: {
        education: {
            level: {
                type: String,
                enum: ['highschool', 'bachelor', 'master', 'phd', 'any']
            },
            majors: [String],
            gpa: Number
        },
        skills: [{
            name: String,
            required: {
                type: Boolean,
                default: false
            },
            level: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced']
            }
        }],
        experience: {
            years: Number,
            type: String
        },
        languages: [String],
        certifications: [String]
    },
    
    // Description & Details
    description: {
        type: String,
        required: true
    },
    responsibilities: [String],
    learningOutcomes: [String],
    projects: [String],
    
    // Application Process
    applicationProcess: {
        method: {
            type: String,
            enum: ['email', 'website', 'linkedin', 'indeed', 'glassdoor', 'other']
        },
        url: String,
        email: String,
        requirements: [String],
        documents: [String]
    },
    
    // Source Information
    source: {
        platform: {
            type: String,
            enum: ['linkedin', 'indeed', 'glassdoor', 'internships.com', 'angel.co', 'manual', 'other'],
            required: true
        },
        originalUrl: String,
        scrapedAt: {
            type: Date,
            default: Date.now
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    
    // Matching & Analytics
    matchScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    popularity: {
        views: { type: Number, default: 0 },
        applications: { type: Number, default: 0 },
        saves: { type: Number, default: 0 }
    },
    
    // Status & Moderation
    status: {
        type: String,
        enum: ['active', 'expired', 'filled', 'suspended', 'pending'],
        default: 'active'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    // Tags & Categories
    tags: [String],
    categories: [{
        type: String,
        enum: [
            'software-development', 'data-science', 'marketing', 'design', 
            'finance', 'healthcare', 'education', 'non-profit', 'startup',
            'research', 'consulting', 'media', 'engineering', 'sales'
        ]
    }],
    
    // Contact Information
    contact: {
        name: String,
        email: String,
        phone: String,
        linkedin: String
    },
    
    // Additional Information
    additionalInfo: {
        teamSize: Number,
        mentorship: Boolean,
        networking: Boolean,
        careerGrowth: Boolean,
        flexibleHours: Boolean,
        travelRequired: Boolean,
        international: Boolean
    },
    
    // SEO & Search
    searchKeywords: [String],
    seoDescription: String,
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date
}, {
    timestamps: true
});

// Indexes for better performance
internshipSchema.index({ 'company.name': 1 });
internshipSchema.index({ 'location.city': 1, 'location.state': 1, 'location.country': 1 });
internshipSchema.index({ workType: 1 });
internshipSchema.index({ 'compensation.type': 1 });
internshipSchema.index({ categories: 1 });
internshipSchema.index({ tags: 1 });
internshipSchema.index({ status: 1 });
internshipSchema.index({ startDate: 1 });
internshipSchema.index({ matchScore: -1 });
internshipSchema.index({ 'popularity.applications': -1 });
internshipSchema.index({ createdAt: -1 });
internshipSchema.index({ 'source.platform': 1, 'source.scrapedAt': -1 });

// Text index for search
internshipSchema.index({
    title: 'text',
    'company.name': 'text',
    description: 'text',
    tags: 'text',
    'requirements.skills.name': 'text'
});

// Pre-save middleware
internshipSchema.pre('save', function(next) {
    this.source.lastUpdated = new Date();
    
    // Auto-calculate match score if not set
    if (!this.matchScore) {
        this.matchScore = this.calculateMatchScore();
    }
    
    next();
});

// Method to calculate match score
internshipSchema.methods.calculateMatchScore = function() {
    let score = 50; // Base score
    
    // Boost for verified companies
    if (this.isVerified) score += 10;
    
    // Boost for paid internships
    if (this.compensation.type === 'paid') score += 15;
    
    // Boost for remote work
    if (this.workType === 'remote') score += 10;
    
    // Boost for recent postings
    const daysSincePosted = (new Date() - this.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSincePosted < 7) score += 10;
    else if (daysSincePosted < 30) score += 5;
    
    // Boost for popular internships
    if (this.popularity.views > 100) score += 5;
    if (this.popularity.applications > 10) score += 5;
    
    return Math.min(score, 100);
};

// Method to check if internship is still active
internshipSchema.methods.isActive = function() {
    if (this.status !== 'active') return false;
    
    // Check if application deadline has passed
    if (this.applicationDeadline && new Date() > this.applicationDeadline) {
        return false;
    }
    
    // Check if start date is too far in the future (more than 6 months)
    if (this.startDate && new Date(this.startDate) > new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)) {
        return false;
    }
    
    return true;
};

// Method to get formatted location
internshipSchema.methods.getFormattedLocation = function() {
    const parts = [];
    if (this.location.city) parts.push(this.location.city);
    if (this.location.state) parts.push(this.location.state);
    if (this.location.country) parts.push(this.location.country);
    
    if (parts.length === 0) return 'Remote';
    
    let location = parts.join(', ');
    if (this.workType === 'remote') location += ' / Remote';
    else if (this.workType === 'hybrid') location += ' / Hybrid';
    
    return location;
};

// Method to get formatted compensation
internshipSchema.methods.getFormattedCompensation = function() {
    if (this.compensation.type === 'unpaid') return 'Unpaid';
    if (this.compensation.type === 'credit-only') return 'Academic Credit Only';
    
    if (this.compensation.amount) {
        const currency = this.compensation.currency || 'USD';
        const period = this.compensation.period || 'total';
        return `${currency} ${this.compensation.amount}/${period}`;
    }
    
    return this.compensation.description || 'Compensation not specified';
};

// Static method to find internships by user preferences
internshipSchema.statics.findByPreferences = function(userPreferences) {
    const query = { status: 'active' };
    
    // Filter by work type
    if (userPreferences.workType && userPreferences.workType !== 'any') {
        query.workType = userPreferences.workType;
    }
    
    // Filter by compensation
    if (userPreferences.compensation === 'paid') {
        query['compensation.type'] = { $in: ['paid', 'stipend'] };
    }
    
    // Filter by locations
    if (userPreferences.locations && userPreferences.locations.length > 0) {
        const locationQuery = userPreferences.locations.map(loc => 
            new RegExp(loc, 'i')
        );
        query.$or = [
            { 'location.city': { $in: locationQuery } },
            { 'location.state': { $in: locationQuery } },
            { 'location.country': { $in: locationQuery } }
        ];
    }
    
    // Filter by domains/categories
    if (userPreferences.domains && userPreferences.domains.length > 0) {
        query.categories = { $in: userPreferences.domains };
    }
    
    // Filter by keywords
    if (userPreferences.keywords && userPreferences.keywords.length > 0) {
        const keywordQuery = userPreferences.keywords.map(keyword => 
            new RegExp(keyword, 'i')
        );
        query.$or = query.$or || [];
        query.$or.push(
            { title: { $in: keywordQuery } },
            { description: { $in: keywordQuery } },
            { tags: { $in: keywordQuery } }
        );
    }
    
    return this.find(query).sort({ matchScore: -1, createdAt: -1 });
};

module.exports = mongoose.model('Internship', internshipSchema); 