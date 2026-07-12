import {
  Listing,
  Gaushala,
  EmergencyAlert,
  TransportService,
  VetService,
} from "./types";

export const initialListings: Listing[] = [
  {
    id: "1",
    title: "Healthy Sahiwal Cow for Adoption",
    breed: "Sahiwal",
    age: "4 Years",
    location: "Jaipur, Rajasthan",
    type: "adopt",
    description:
      "Looking for a caring Gaushala or Gaurakshak to adopt our beloved cow. We are relocating and cannot take her with us.",
    imageUrl:
      "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&q=80&w=600",
    sellerName: "Ramesh Kumar",
    contactNumber: "+91 98765 43210",
    postedAt: "2 hours ago",
    verified: true,
    milkingStatus: "milking",
  },
  {
    id: "2",
    title: "Gir Calf Available",
    breed: "Gir",
    age: "6 Months",
    location: "Ahmedabad, Gujarat",
    type: "sell",
    price: 15000,
    description:
      "Beautiful female Gir calf. Looking for a good Hindu home where she will be respected and nurtured.",
    imageUrl:
      "https://images.unsplash.com/photo-1570527344754-0ebf30e01ba0?auto=format&fit=crop&q=80&w=600",
    sellerName: "Amit Patel",
    contactNumber: "+91 91234 56789",
    postedAt: "1 day ago",
    verified: true,
    milkingStatus: "calf",
  },
  {
    id: "3",
    title: "Seeking Safe Home for Old Cow",
    breed: "Desi",
    age: "12 Years",
    location: "Mathura, UP",
    type: "adopt",
    description:
      "She has stopped giving milk and needs a peaceful retirement in a loving shelter or Gaushala.",
    imageUrl:
      "https://images.unsplash.com/photo-1628151044458-1f1af3aa5391?auto=format&fit=crop&q=80&w=600",
    sellerName: "Sunita Devi",
    contactNumber: "+91 98877 66554",
    postedAt: "3 days ago",
    verified: false,
    milkingStatus: "non-milking",
  },
  {
    id: "4",
    title: "Strong Tharparkar Cow",
    breed: "Tharparkar",
    age: "3 Years",
    location: "Jodhpur, Rajasthan",
    type: "sell",
    price: 45000,
    description:
      "Very healthy and docile. Need to sell urgently. Only contacting genuine buyers who care for cows.",
    imageUrl:
      "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=600",
    sellerName: "Narayan Singh",
    contactNumber: "+91 87654 32109",
    postedAt: "1 week ago",
    verified: true,
    milkingStatus: "milking",
  },
];

export const initialGaushalas: Gaushala[] = [
  {
    id: "g1",
    name: "Shree Krishna Gaushala",
    location: "Mathura, UP",
    capacity: "500+ Cows",
    description:
      "A verified shelter dedicated to the rehabilitation of old and stray cows. We welcome non-milking cows.",
    verified: true,
    imageUrl:
      "https://images.unsplash.com/photo-1595163152648-5c4e405f6fc4?auto=format&fit=crop&q=80&w=600",
    contactNumber: "+91 80000 11111",
    needsSponsorship: true,
    monthlySponsorshipCost: 2100,
    upiId: "shreekrishna.mathura@okaxis",
    payeeName: "Shree Krishna Gaushala Trust",
    bankAccount: "100987654321",
    ifscCode: "UTIB0000123",
    bankName: "Axis Bank",
  },
  {
    id: "g2",
    name: "Gau Seva Dham",
    location: "Jaipur, Rajasthan",
    capacity: "200 Cows",
    description:
      "Providing medical care and peaceful shelter for rescued animals. Supported by local volunteers.",
    verified: true,
    imageUrl:
      "https://images.unsplash.com/photo-1596733430284-f74370603735?auto=format&fit=crop&q=80&w=600",
    contactNumber: "+91 80000 22222",
    needsSponsorship: true,
    monthlySponsorshipCost: 3100,
    upiId: "gausevadham.jaipur@sbi",
    payeeName: "Gau Seva Dham Charitable Trust",
    bankAccount: "300912345678",
    ifscCode: "SBIN0000321",
    bankName: "State Bank of India",
  },
];

export const initialAlerts: EmergencyAlert[] = [
  {
    id: "a1",
    type: "injured",
    location: "NH-48 Highway, near Gurugram toll",
    description:
      "Cow hit by a truck, severely injured on the left leg. Needs immediate vet assistance and transport.",
    urgency: "critical",
    status: "active",
    postedAt: "10 mins ago",
  },
  {
    id: "a2",
    type: "smuggling",
    location: "Mewat border crossing",
    description:
      "Suspicious unmarked truck spotted moving towards the border at night. Please alert local Gaurakshaks.",
    urgency: "high",
    status: "active",
    postedAt: "1 hour ago",
  },
];

export const initialTransports: TransportService[] = [
  {
    id: "t1",
    name: "Gau-Rath Transport Services (Ram Singh)",
    vehicleType: "Modified Pickup Truck (Cow safe)",
    location: "Delhi NCR & Haryana",
    verified: true,
    contactNumber: "+91 99999 00001",
  },
  {
    id: "t2",
    name: "Safe Haven Transit",
    vehicleType: "Heavy Truck with Ramp",
    location: "Rajasthan statewide",
    verified: true,
    contactNumber: "+91 99999 00002",
  },
];

export const initialVets: VetService[] = [
  {
    id: "v1",
    name: "Dr. Sharma (Livestock Specialist)",
    specialization: "Large Animals & Bovine Health",
    location: "Agra, UP",
    verified: true,
    contactNumber: "+91 98888 11111",
    experience: "15 Years",
  },
  {
    id: "v2",
    name: "Dr. Patel (Gau Chikitsak)",
    specialization: "Ayurvedic & Allopathic Vet Care",
    location: "Ahmedabad, Gujarat",
    verified: true,
    contactNumber: "+91 98888 22222",
    experience: "10 Years",
  },
];
