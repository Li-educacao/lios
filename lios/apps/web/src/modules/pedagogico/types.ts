export interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  hotmart_buyer_email: string | null;
  status: StudentStatus;
  google_contact_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  ped_enrollments?: Enrollment[];
  ped_contracts?: ContractSummary[];
}

export interface PedClass {
  id: string;
  name: string;
  abbreviation: string;
  product_hotmart_id: string | null;
  product_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'completed' | 'cancelled';
  drive_folder_id: string | null;
  sheets_spreadsheet_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  student_count?: number;
  total_enrollments?: number;
  ped_enrollments?: EnrollmentWithStudent[];
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  hotmart_transaction: string | null;
  hotmart_product_id: string | null;
  purchase_date: string | null;
  amount_paid: number | null;
  payment_method: string | null;
  status: EnrollmentStatus;
  accessed_at: string | null;
  enrolled_at: string;
  metadata: Record<string, unknown>;
  ped_classes?: { id: string; name: string; abbreviation: string };
  ped_students?: { id: string; full_name: string; email: string };
}

export interface EnrollmentWithStudent extends Enrollment {
  ped_students: { id: string; full_name: string; email: string; phone: string | null; status: string };
}

export interface ContractSummary {
  id: string;
  status: string;
  drive_url: string | null;
  sent_at: string | null;
  created_at: string;
}

export type StudentStatus = 'active' | 'inactive' | 'cancelled' | 'refunded';
export type EnrollmentStatus = 'active' | 'pending' | 'accessed' | 'cancelled' | 'refunded' | 'chargeback' | 'expired';

export const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  pending: 'Pendente',
  accessed: 'Acessou',
  chargeback: 'Chargeback',
  expired: 'Expirado',
  completed: 'Concluída',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  accessed: { bg: 'bg-green-500/15', text: 'text-green-400' },
  inactive: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
  cancelled: { bg: 'bg-red-500/15', text: 'text-red-400' },
  refunded: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  pending: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  chargeback: { bg: 'bg-red-500/15', text: 'text-red-400' },
  expired: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
  completed: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
};
