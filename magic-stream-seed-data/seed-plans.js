// MongoDB Seed Script for Subscription Plans
// Run this in MongoDB shell: mongosh your_database_name < seed-plans.js
// Or copy-paste the insertMany command into MongoDB Compass or mongosh

// Clear existing plans (optional - uncomment if needed)
// db.plans.deleteMany({});

db.plans.insertMany([
  {
    plan_id: "basic",
    name: "Basic",
    price_monthly: 5.99,
    max_streams: 1,
    max_quality: "720p",
    features: [
      "SD Quality (720p)",
      "Watch on 1 device",
      "Mobile streaming only",
      "Ad-supported"
    ],
    is_popular: false,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    plan_id: "standard",
    name: "Standard",
    price_monthly: 9.99,
    max_streams: 2,
    max_quality: "1080p",
    features: [
      "Full HD (1080p)",
      "Watch on 2 devices",
      "TV + Mobile + Web",
      "Ad-free experience",
      "Download for offline"
    ],
    is_popular: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    plan_id: "premium",
    name: "Premium",
    price_monthly: 14.99,
    max_streams: 4,
    max_quality: "4K",
    features: [
      "4K + HDR Quality",
      "Watch on 4 devices",
      "All platforms",
      "Ad-free experience",
      "Unlimited downloads",
      "Early access to new releases"
    ],
    is_popular: false,
    created_at: new Date(),
    updated_at: new Date()
  }
]);

print("Plans seeded successfully!");
print("Total plans: " + db.plans.countDocuments());

