export interface Listing {
  id: string;
  userId?: string;
  title: string;
  breed: string;
  age: string;
  location: string;
  type: "adopt" | "sell";
  price?: number;
  description: string;
  imageUrl?: string;
  sellerName: string;
  contactNumber: string;
  postedAt: string;
  verified: boolean;
  featured?: boolean;
  milkingStatus: "milking" | "non-milking" | "calf" | "pregnant" | "heifer" | "dry";
  dailyMilkYield?: number;
  reasonForRehoming?: string;
  sacredDeclaration?: boolean;
  healthStatus?: string;
  temperament?: string;
  transportAssistance?: string;
}

export interface Gaushala {
  id: string;
  userId?: string;
  name: string;
  location: string;
  capacity: string;
  description: string;
  verified: boolean;
  imageUrl?: string;
  contactNumber: string;
  needsSponsorship: boolean;
  monthlySponsorshipCost?: number;
  upiId?: string;
  payeeName?: string;
  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
}

export interface EmergencyAlert {
  id: string;
  userId?: string;
  type: "injured" | "abandoned" | "smuggling";
  location: string;
  description: string;
  urgency: "high" | "critical";
  status: "active" | "resolved";
  postedAt: string;
}

export interface TransportService {
  id: string;
  userId?: string;
  name: string;
  vehicleType: string;
  location: string;
  verified: boolean;
  contactNumber: string;
}

export interface VetService {
  id: string;
  userId?: string;
  name: string;
  specialization: string;
  location: string;
  verified: boolean;
  contactNumber: string;
  experience: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  idProofType?: string;
  idProofUrl?: string;
  selfieUrl?: string;
  /** @deprecated legacy field names, kept for backward compatibility with old rows */
  idDocumentBase64?: string;
  selfieBase64?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: "general" | "listing" | "account" | "payment" | "report" | "other";
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  attachmentUrl?: string;
  userComment?: string;
  createdAt: string;
  updatedAt?: string;
  adminReply?: string;
}

export interface Sponsorship {
  id: string;
  userId?: string;
  gaushalaId: string;
  gaushalaName: string;
  donorName: string;
  donorPhone: string;
  amount: number;
  paymentMethod: "upi" | "bank";
  referenceNo: string;
  status: "pending" | "verified";
  submittedAt: string;
  donorUserId?: string;
}
