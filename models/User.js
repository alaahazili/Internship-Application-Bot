const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Authentication
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Profile Information
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    linkedinUrl: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    profilePicture: {
        type: String
    },
    
    // Education
    currentEducation: {
        type: String,
        enum: ['highschool', 'bachelor', 'bachelor-completed', 'master', 'master-completed', 'phd', 'phd-completed'],
        required: true
    },
    major: {
        type: String,
        required: true,
        trim: true
    },
    university: {
        type: String,
        required: true,
        trim: true
    },
    graduationYear: {
        type: Number,
        required: true,
        min: 2020,
        max: 2030
    },
    gpa: {
        type: Number,
        min: 0,
        max: 4.0
    },
    
    // Skills & Experience
    skills: [{
        name: String,
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        }
    }],
    languages: [{
        language: String,
        proficiency: {
            type: String,
            enum: ['basic', 'conversational', 'fluent', 'native']
        }
    }],
    workExperience: [{
        title: String,
        company: String,
        duration: String,
        description: String,
        startDate: Date,
        endDate: Date,
        isCurrent: Boolean
    }],
    projects: [{
        title: String,
        description: String,
        technologies: [String],
        githubUrl: String,
        liveUrl: String,
        completionDate: Date
    }],
    
    // Documents
    resume: {
        filename: String,
        originalName: String,
        path: String,
        uploadedAt: Date
    },
    coverLetter: {
        filename: String,
        originalName: String,
        path: String,
        uploadedAt: Date
    },
    portfolio: {
        type: String,
        trim: true
    },
    
    // Preferences
    internshipPreferences: {
        internshipType: [String],
        duration: {
            type: String,
            enum: ['1-3months', '3-6months', 'flexible']
        },
        workType: {
            type: String,
            enum: ['remote', 'onsite', 'hybrid', 'any']
        },
        locations: [String],
        domains: [String],
        compensation: {
            type: String,
            enum: ['paid', 'unpaid', 'any']
        },
        minSalary: Number,
        startDate: Date,
        keywords: [String],
        excludeKeywords: [String]
    },
    
    // Email Settings
    emailSettings: {
        frequency: {
            type: String,
            enum: ['instant', 'daily', 'weekly'],
            default: 'daily'
        },
        maxJobsPerEmail: {
            type: Number,
            default: 5,
            min: 1,
            max: 20
        },
        digestTime: {
            type: String,
            default: '09:00'
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        notifications: {
            newJobs: { type: Boolean, default: true },
            applicationUpdates: { type: Boolean, default: true },
            interviewReminders: { type: Boolean, default: true },
            followUpReminders: { type: Boolean, default: true }
        }
    },
    
    // Application Tracking
    applications: [{
        internshipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Internship'
        },
        status: {
            type: String,
            enum: ['applied', 'under-review', 'interview-scheduled', 'interviewed', 'accepted', 'rejected', 'withdrawn'],
            default: 'applied'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        },
        coverLetter: String,
        followUpDate: Date,
        notes: String,
        interviewDate: Date,
        interviewType: {
            type: String,
            enum: ['phone', 'video', 'onsite']
        }
    }],
    
    // Statistics
    stats: {
        internshipsFound: { type: Number, default: 0 },
        applicationsGenerated: { type: Number, default: 0 },
        emailsSent: { type: Number, default: 0 },
        matchRate: { type: Number, default: 0 },
        interviewsScheduled: { type: Number, default: 0 },
        offersReceived: { type: Number, default: 0 }
    },
    
    // Account Settings
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    loginCount: {
        type: Number,
        default: 0
    },
    
    // API Usage
    apiUsage: {
        dailyRequests: { type: Number, default: 0 },
        monthlyRequests: { type: Number, default: 0 },
        lastReset: { type: Date, default: Date.now }
    }
}, {
    timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ 'internshipPreferences.locations': 1 });
userSchema.index({ 'internshipPreferences.domains': 1 });
userSchema.index({ 'stats.applicationsGenerated': -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.emailVerificationToken;
    delete userObject.passwordResetToken;
    delete userObject.apiUsage;
    return userObject;
};

// Method to update stats
userSchema.methods.updateStats = function(type, value = 1) {
    if (this.stats[type] !== undefined) {
        this.stats[type] += value;
    }
    return this.save();
};

// Method to check if user can make API request
userSchema.methods.canMakeRequest = function() {
    const now = new Date();
    const lastReset = new Date(this.apiUsage.lastReset);
    
    // Reset daily count if it's a new day
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
        this.apiUsage.dailyRequests = 0;
        this.apiUsage.lastReset = now;
    }
    
    // Check daily limit (100 requests per day)
    if (this.apiUsage.dailyRequests >= 100) {
        return false;
    }
    
    this.apiUsage.dailyRequests += 1;
    this.apiUsage.monthlyRequests += 1;
    return true;
};

module.exports = mongoose.model('User', userSchema); 