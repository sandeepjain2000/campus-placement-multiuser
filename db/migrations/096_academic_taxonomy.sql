-- Academic taxonomy: degrees, disciplines, specializations, eligibility groups, academic programs.

CREATE TABLE IF NOT EXISTS taxonomy_degree_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT taxonomy_degree_levels_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS taxonomy_degrees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level_id UUID NOT NULL REFERENCES taxonomy_degree_levels(id) ON DELETE CASCADE,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_engineering_default BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT taxonomy_degrees_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_degrees_level ON taxonomy_degrees (level_id, sort_order);

CREATE TABLE IF NOT EXISTS taxonomy_discipline_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(60) NOT NULL,
    name VARCHAR(160) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT taxonomy_discipline_categories_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS taxonomy_disciplines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES taxonomy_discipline_categories(id) ON DELETE SET NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_engineering_default BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT taxonomy_disciplines_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_disciplines_category ON taxonomy_disciplines (category_id, sort_order);

CREATE TABLE IF NOT EXISTS taxonomy_specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discipline_id UUID REFERENCES taxonomy_disciplines(id) ON DELETE SET NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT taxonomy_specializations_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_specializations_discipline ON taxonomy_specializations (discipline_id, sort_order);

CREATE TABLE IF NOT EXISTS taxonomy_eligibility_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(60) NOT NULL,
    name VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_engineering_default BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT taxonomy_eligibility_groups_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS taxonomy_academic_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(120) NOT NULL,
    degree_id UUID NOT NULL REFERENCES taxonomy_degrees(id) ON DELETE CASCADE,
    discipline_id UUID NOT NULL REFERENCES taxonomy_disciplines(id) ON DELETE CASCADE,
    specialization_id UUID REFERENCES taxonomy_specializations(id) ON DELETE SET NULL,
    eligibility_group_id UUID NOT NULL REFERENCES taxonomy_eligibility_groups(id) ON DELETE RESTRICT,
    display_name VARCHAR(255) NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_engineering_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT taxonomy_academic_programs_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_programs_degree ON taxonomy_academic_programs (degree_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_taxonomy_programs_eligibility ON taxonomy_academic_programs (eligibility_group_id);
