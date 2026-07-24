/**
 * CENTRAL DUAL-MATRIX SECURITY & PERMISSIONS HELPER (ROLE + ASSIGNED PROJECTS)
 * Standards: 7-Layer Atomic Architecture - T1_Utils
 */

export interface UserPermissionsContext {
  email?: string;
  role?: string;
  assignedProjectIds?: string[];
  [key: string]: any;
}

/**
 * 1. Check if user has VIEW access to a specific project
 */
export const canViewProject = (
  user: UserPermissionsContext | null | undefined,
  projectId: string,
  projectData?: any
): boolean => {
  if (!user) return false;
  const role = user.role;
  if (role === 'ADMIN') return true; // ADMIN sees all projects

  const assigned = user.assignedProjectIds || [];
  if (assigned.includes('ALL')) return true;
  if (projectId && assigned.includes(projectId)) return true;

  // Fallback check against project owner/assigned emails if projectData provided
  if (projectData && user.email) {
    const email = user.email.toLowerCase().trim();
    const owner = (projectData.ownerEmail || '').toLowerCase().trim();
    const assignedEmails = (projectData.assignedEmails || []).map((e: string) => (e || '').toLowerCase().trim());
    if (owner === email || assignedEmails.includes(email)) return true;
  }

  return false;
};

/**
 * 2. Check if user has EDIT / UPDATE / DELETE access to a specific project
 */
export const canEditProject = (
  user: UserPermissionsContext | null | undefined,
  projectId: string,
  projectData?: any
): boolean => {
  if (!user) return false;
  const role = user.role;

  if (role === 'ADMIN') return true;
  if (role === 'VIEWER') return false; // VIEWER is strictly READ-ONLY

  // Check if user has view permission first
  const hasView = canViewProject(user, projectId, projectData);
  if (!hasView) return false;

  // PROJECT_MANAGER and MEMBER can edit if they have access to the project
  return role === 'PROJECT_MANAGER' || role === 'MEMBER';
};

/**
 * 3. Check if user has permission to CREATE new projects
 * Only ADMIN and PROJECT_MANAGER roles are permitted to create new projects.
 * MEMBER and VIEWER roles are hidden.
 */
export const canCreateProject = (
  user: UserPermissionsContext | null | undefined
): boolean => {
  if (!user) return false;
  const role = user.role;
  return role === 'ADMIN' || role === 'PROJECT_MANAGER';
};

/**
 * 4. Filter projects list for user using central permission matrix
 */
export const filterVisibleProjects = (
  projects: any[],
  user: UserPermissionsContext | null | undefined
): any[] => {
  if (!projects) return [];
  if (!user) return [];
  return projects.filter(p => canViewProject(user, p.PROJECT_ID || p.id || p.projectId, p));
};
