export type UserRole =
  | 'platform_admin'
  | 'group_admin'
  | 'home_manager'
  | 'registered_manager'
  | 'senior_carer'
  | 'carer'
  | 'nurse'
  | 'finance_admin'
  | 'family_member'
  | 'gp_external';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organisation_id: string | null;
  home_ids: string[];
  mfa_enabled: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginSuccessResponse extends TokenPair {
  requires_mfa: false;
  user: AuthUser;
}

export interface LoginMfaPendingResponse {
  requires_mfa: true;
  mfa_token: string;
  expires_in: number;
}

export type LoginResponse = LoginSuccessResponse | LoginMfaPendingResponse;

export interface MfaVerifyResponse extends TokenPair {
  requires_mfa: false;
  user: AuthUser;
  device_id?: string;
}

// Roles that must have MFA enforced
export const MFA_REQUIRED_ROLES: UserRole[] = [
  'home_manager',
  'registered_manager',
  'group_admin',
  'platform_admin',
];

// Role display labels
export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin:     'Platform Administrator',
  group_admin:        'Group Administrator',
  home_manager:       'Home Manager',
  registered_manager: 'Registered Manager',
  senior_carer:       'Senior Carer',
  carer:              'Care Assistant',
  nurse:              'Nurse',
  finance_admin:      'Finance Administrator',
  family_member:      'Family Member',
  gp_external:        'GP / External Clinician',
};

// Roles with access to manager-level dashboard
export const MANAGER_ROLES: UserRole[] = [
  'home_manager',
  'registered_manager',
  'group_admin',
  'platform_admin',
];
