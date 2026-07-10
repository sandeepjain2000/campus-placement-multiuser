-- Campus Placement SaaS - Database Schema Script
-- Canonical source: db/schema.sql
-- Usage (PostgreSQL): psql -f prompts/database_schema.sql

-- This script mirrors the current schema definition.
-- Keep this file in sync with db/schema.sql when schema changes.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'college' CHECK (type IN ('college', 'group')),
    logo_url TEXT,
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    accreditation VARCHAR(100),
    naac_grade VARCHAR(10),
    nirf_rank INTEGER,
    established_year INTEGER,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    communication_email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'college_admin', 'employer', 'student')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    roll_number VARCHAR(50),
    enrollment_number VARCHAR(50),
    department VARCHAR(100),
    branch VARCHAR(100),
    batch_year INTEGER,
    graduation_year INTEGER,
    cgpa DECIMAL(4,2),
    tenth_percentage DECIMAL(5,2),
    twelfth_percentage DECIMAL(5,2),
    diploma_percentage DECIMAL(5,2),
    backlogs_active INTEGER DEFAULT 0,
    backlogs_history INTEGER DEFAULT 0,
    gender VARCHAR(20),
    date_of_birth DATE,
    category VARCHAR(50),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    expected_salary_min DECIMAL(12,2),
    expected_salary_max DECIMAL(12,2),
    preferred_locations TEXT[],
    willing_to_relocate BOOLEAN DEFAULT true,
    placement_status VARCHAR(30) DEFAULT 'unplaced' CHECK (placement_status IN ('unplaced', 'placed', 'opted_out', 'higher_studies')),
    offers_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    resume_url TEXT,
    bio TEXT,
    affiliated_institution_name VARCHAR(255),
    member_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_slug VARCHAR(100) UNIQUE,
    industry VARCHAR(100),
    company_type VARCHAR(50) CHECK (company_type IN ('mnc', 'startup', 'psu', 'private', 'government', 'ngo', 'other')),
    company_size VARCHAR(50),
    founded_year INTEGER,
    website VARCHAR(255),
    logo_url TEXT,
    description TEXT,
    headquarters VARCHAR(255),
    locations TEXT[],
    linkedin_url VARCHAR(255),
    glassdoor_url VARCHAR(255),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT false,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    reliability_score DECIMAL(3,1) DEFAULT 0,
    total_hires INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    job_type VARCHAR(30) CHECK (job_type IN ('full_time', 'internship', 'contract', 'ppo', 'hackathon', 'short_project', 'mentorship', 'guest_faculty')),
    category VARCHAR(100),
    locations TEXT[],
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency VARCHAR(3) DEFAULT 'INR',
    bond_duration_months INTEGER DEFAULT 0,
    bond_penalty DECIMAL(12,2),
    eligible_branches TEXT[],
    min_cgpa DECIMAL(4,2),
    max_backlogs INTEGER DEFAULT 0,
    min_tenth_pct DECIMAL(5,2),
    min_twelfth_pct DECIMAL(5,2),
    batch_year INTEGER,
    skills_required TEXT[],
    perks TEXT[],
    vacancies INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'cancelled')),
    application_deadline TIMESTAMP,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS placement_drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employer_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    drive_type VARCHAR(30) DEFAULT 'on_campus' CHECK (drive_type IN ('on_campus', 'off_campus', 'virtual', 'hybrid')),
    drive_date DATE,
    start_time TIME,
    end_time TIME,
    venue VARCHAR(255),
    status VARCHAR(30) DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    max_students INTEGER,
    registered_count INTEGER DEFAULT 0,
    selected_count INTEGER DEFAULT 0,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    requires_ppt BOOLEAN DEFAULT false,
    ppt_completed BOOLEAN DEFAULT false,
    notes TEXT,
    social_shared TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    drive_id UUID REFERENCES placement_drives(id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'in_progress', 'selected', 'rejected', 'withdrawn', 'on_hold')),
    current_round INTEGER DEFAULT 0,
    applied_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    withdrawal_reason TEXT,
    notes TEXT,
    UNIQUE(student_id, drive_id)
);

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    employer_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
    drive_id UUID REFERENCES placement_drives(id) ON DELETE SET NULL,
    job_title VARCHAR(255),
    salary DECIMAL(12,2),
    salary_currency VARCHAR(3) DEFAULT 'INR',
    joining_date DATE,
    location VARCHAR(255),
    offer_letter_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'revoked')),
    deadline TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'drive', 'offer', 'application')),
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Note:
-- Full, complete schema with all supporting tables/indexes lives in db/schema.sql.
-- This prompt-friendly schema script includes the core placement entities most commonly required.
