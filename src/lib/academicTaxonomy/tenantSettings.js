import {
  ENGINEERING_COLLEGE_TAXONOMY_DEFAULTS,
  GENERAL_COLLEGE_TAXONOMY_DEFAULTS,
} from '@/lib/academicTaxonomy/seedData';

/**
 * @param {unknown} raw
 */
export function parseCollegeTaxonomySettings(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const profile =
    String(src.institutionProfile || src.institution_profile || 'engineering').toLowerCase() === 'general'
      ? 'general'
      : 'engineering';
  const base = profile === 'engineering' ? ENGINEERING_COLLEGE_TAXONOMY_DEFAULTS : GENERAL_COLLEGE_TAXONOMY_DEFAULTS;

  const usePlatformDefaults =
    src.usePlatformDefaults !== undefined ? Boolean(src.usePlatformDefaults) : base.usePlatformDefaults;

  return {
    institutionProfile: profile,
    usePlatformDefaults,
    defaultDegreeCode: String(src.defaultDegreeCode || src.default_degree_code || base.defaultDegreeCode || '').trim(),
    defaultProgramCode:
      String(src.defaultProgramCode || src.default_program_code || base.defaultProgramCode || '').trim() || null,
    defaultEligibilityGroupCodes: Array.isArray(src.defaultEligibilityGroupCodes || src.default_eligibility_group_codes)
      ? (src.defaultEligibilityGroupCodes || src.default_eligibility_group_codes).map((c) => String(c).trim()).filter(Boolean)
      : base.defaultEligibilityGroupCodes,
    restrictProgramsToDefaults:
      src.restrictProgramsToDefaults !== undefined
        ? Boolean(src.restrictProgramsToDefaults)
        : base.restrictProgramsToDefaults,
    enabledProgramCodes: Array.isArray(src.enabledProgramCodes || src.enabled_program_codes)
      ? (src.enabledProgramCodes || src.enabled_program_codes).map((c) => String(c).trim()).filter(Boolean)
      : null,
  };
}

export function mergeTaxonomySettingsForSave(settings) {
  return {
    institutionProfile: settings.institutionProfile,
    usePlatformDefaults: settings.usePlatformDefaults,
    defaultDegreeCode: settings.defaultDegreeCode || null,
    defaultProgramCode: settings.defaultProgramCode,
    defaultEligibilityGroupCodes: settings.defaultEligibilityGroupCodes || [],
    restrictProgramsToDefaults: settings.restrictProgramsToDefaults,
    enabledProgramCodes: settings.enabledProgramCodes,
  };
}

export function getTaxonomyFromTenantSettings(tenantSettings) {
  const settings = tenantSettings && typeof tenantSettings === 'object' ? tenantSettings : {};
  return parseCollegeTaxonomySettings(settings.academicTaxonomy || settings.academic_taxonomy);
}
