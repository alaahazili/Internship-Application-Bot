const express = require('express');
const Internship = require('../models/Internship');
const router = express.Router();

// Public route - GET /api/internships/public (no authentication required)
router.get('/public', async (req, res, next) => {
  try {
    const { city, domain, duration, workType, compensation, startDate } = req.query;
    const filter = {
      status: 'active',
      'location.country': 'Morocco'
    };
    
    if (city) filter['location.city'] = city;
    if (domain) filter.categories = domain;
    if (duration) filter.duration = new RegExp(duration, 'i');
    if (workType) filter.workType = workType;
    if (compensation) filter['compensation.type'] = compensation;
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    
    console.log('[Internships API] Public filters:', filter);
    const internships = await Internship.find(filter).sort({ matchScore: -1, createdAt: -1 }).limit(20);
    console.log(`[Internships API] Found ${internships.length} internships.`);
    
    // Format internships for frontend
    const formattedInternships = internships.map(internship => ({
      id: internship._id,
      title: internship.title,
      company: internship.company.name,
      location: internship.getFormattedLocation(),
      duration: internship.duration,
      description: internship.description,
      match: internship.matchScore,
      compensation: internship.getFormattedCompensation(),
      posted: formatDate(internship.createdAt),
      startDate: formatDate(internship.startDate),
      requirements: internship.requirements.skills.map(skill => skill.name).join(', ') || 'No specific requirements',
      workType: internship.workType,
      categories: internship.categories,
      originalUrl: internship.source.originalUrl || null,
      contact: {
        name: internship.contact?.name || null,
        email: internship.contact?.email || null,
        phone: internship.contact?.phone || null,
        linkedin: internship.contact?.linkedin || null
      }
    }));
    
    res.json({ internships: formattedInternships });
  } catch (err) {
    console.error('[Internships API] Error:', err);
    next(err);
  }
});

// Seed sample data route - POST /api/internships/seed (for development)
router.post('/seed', async (req, res, next) => {
  try {
    const sampleInternships = [
      {
        title: "Software Development Intern",
        company: {
          name: "TechCorp Morocco",
          website: "https://techcorp.ma",
          industry: "Technology",
          size: "medium"
        },
        location: {
          city: "Casablanca",
          country: "Morocco"
        },
        workType: "hybrid",
        duration: "3-6 months",
        startDate: new Date('2025-06-01'),
        compensation: {
          type: "paid",
          amount: 25,
          currency: "USD",
          period: "hourly"
        },
        description: "Join our development team working on cutting-edge web applications. Learn React, Node.js, and cloud technologies.",
        requirements: {
          skills: [
            { name: "JavaScript", required: true, level: "intermediate" },
            { name: "React", required: false, level: "beginner" },
            { name: "Node.js", required: false, level: "beginner" }
          ]
        },
        categories: ["software-development"],
        status: "active",
        contact: {
          name: "Sarah Johnson",
          email: "sarah.johnson@techcorp.ma",
          phone: "+212-522-123-456",
          linkedin: "https://linkedin.com/in/sarah-johnson-tech"
        },
        source: {
          platform: "manual",
          originalUrl: "https://www.linkedin.com/jobs/view/1234567890/"
        }
      },
      {
        title: "Data Science Intern",
        company: {
          name: "DataFlow Analytics",
          website: "https://dataflow.ma",
          industry: "Analytics",
          size: "small"
        },
        location: {
          city: "Rabat",
          country: "Morocco"
        },
        workType: "remote",
        duration: "3-6 months",
        startDate: new Date('2025-07-01'),
        compensation: {
          type: "paid",
          amount: 20,
          currency: "USD",
          period: "hourly"
        },
        description: "Work with big data, machine learning models, and business intelligence tools. Real-world project experience.",
        requirements: {
          skills: [
            { name: "Python", required: true, level: "intermediate" },
            { name: "Statistics", required: true, level: "intermediate" },
            { name: "Machine Learning", required: false, level: "beginner" }
          ]
        },
        categories: ["data-science"],
        status: "active",
        contact: {
          name: "Ahmed Benali",
          email: "ahmed.benali@dataflow.ma",
          phone: "+212-537-789-012",
          linkedin: "https://linkedin.com/in/ahmed-benali-data"
        },
        source: {
          platform: "manual",
          originalUrl: "https://www.linkedin.com/jobs/view/1234567890/"
        }
      },
      {
        title: "DevOps Intern",
        company: {
          name: "CloudTech Solutions",
          website: "https://cloudtech.ma",
          industry: "Cloud Services",
          size: "medium"
        },
        location: {
          city: "Marrakech",
          country: "Morocco"
        },
        workType: "onsite",
        duration: "3-6 months",
        startDate: new Date('2025-08-01'),
        compensation: {
          type: "paid",
          amount: 18,
          currency: "USD",
          period: "hourly"
        },
        description: "Learn cloud infrastructure, CI/CD pipelines, and automation tools. Work with AWS and Docker.",
        requirements: {
          skills: [
            { name: "Linux", required: true, level: "intermediate" },
            { name: "Docker", required: false, level: "beginner" },
            { name: "AWS", required: false, level: "beginner" }
          ]
        },
        categories: ["software-development"],
        status: "active",
        contact: {
          name: "Fatima Zahra",
          email: "fatima.zahra@cloudtech.ma",
          phone: "+212-524-456-789",
          linkedin: "https://linkedin.com/in/fatima-zahra-cloud"
        },
        source: {
          platform: "manual",
          originalUrl: "https://www.linkedin.com/jobs/view/1234567890/"
        }
      },
      {
        title: "UX/UI Design Intern",
        company: {
          name: "Creative Digital Agency",
          website: "https://creative.ma",
          industry: "Design",
          size: "small"
        },
        location: {
          city: "Tangier",
          country: "Morocco"
        },
        workType: "hybrid",
        duration: "3-6 months",
        startDate: new Date('2025-09-01'),
        compensation: {
          type: "paid",
          amount: 22,
          currency: "USD",
          period: "hourly"
        },
        description: "Work on mobile app designs and user research. Portfolio review required. Perfect for design students.",
        requirements: {
          skills: [
            { name: "Figma", required: true, level: "intermediate" },
            { name: "User Research", required: false, level: "beginner" },
            { name: "Prototyping", required: false, level: "beginner" }
          ]
        },
        categories: ["design"],
        status: "active",
        contact: {
          name: "Youssef Alami",
          email: "youssef.alami@creative.ma",
          phone: "+212-539-321-654",
          linkedin: "https://linkedin.com/in/youssef-alami-design"
        },
        source: {
          platform: "manual",
          originalUrl: "https://www.linkedin.com/jobs/view/1234567890/"
        }
      }
    ];

    // Clear existing sample data
    await Internship.deleteMany({ 'source.platform': 'manual' });
    
    // Insert sample data
    const createdInternships = await Internship.insertMany(sampleInternships);
    
    console.log(`[Internships API] Seeded ${createdInternships.length} sample internships`);
    res.json({ 
      message: `Successfully seeded ${createdInternships.length} sample internships`,
      count: createdInternships.length 
    });
  } catch (err) {
    console.error('[Internships API] Seeding error:', err);
    next(err);
  }
});

// GET /api/internships?city=Casablanca&domain=software-development&duration=3-6months&workType=remote&compensation=paid&startDate=2024-07-01
router.get('/', async (req, res, next) => {
  try {
    const { city, domain, duration, workType, compensation, startDate } = req.query;
    const filter = {
      status: 'active',
      'location.country': 'Morocco',
      categories: { $in: ['software-development', 'data-science', 'devops'] }
    };
    if (city) filter['location.city'] = city;
    if (domain) filter.categories = domain;
    if (duration) filter.duration = new RegExp(duration, 'i');
    if (workType) filter.workType = workType;
    if (compensation) filter['compensation.type'] = compensation;
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    console.log('[Internships API] Filters:', filter);
    const internships = await Internship.find(filter).sort({ matchScore: -1, createdAt: -1 });
    console.log(`[Internships API] Found ${internships.length} internships.`);
    res.json({ internships });
  } catch (err) {
    console.error('[Internships API] Error:', err);
    next(err);
  }
});

// (Optional) GET /api/internships/:id
router.get('/:id', async (req, res, next) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });
    res.json({ internship });
  } catch (err) {
    console.error('[Internships API] Error:', err);
    next(err);
  }
});

// Helper function to format dates
function formatDate(date) {
  if (!date) return 'Not specified';
  const now = new Date();
  const diffTime = Math.abs(now - new Date(date));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

module.exports = router; 