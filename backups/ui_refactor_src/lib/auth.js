import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from './db';
import { SEED_DEMO_STUDENT_USER_IDS } from './seedDemoStudentIds';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const result = await query(
            `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug, t.logo_url as tenant_logo_url,
                    ep.logo_url AS employer_logo_url,
                    sp.is_verified AS student_placement_verified
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             LEFT JOIN employer_profiles ep ON ep.user_id = u.id
             LEFT JOIN student_profiles sp ON sp.user_id = u.id
             WHERE u.email = $1`,
            [credentials.email]
          );

          const user = result.rows[0];
          if (!user) {
            throw new Error('Invalid email or password.');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) throw new Error('Invalid password');

          if (!user.is_active) {
            if (['college_admin', 'employer'].includes(user.role)) {
              if (user.registration_rejected_at) {
                const hint = user.registration_rejection_note
                  ? ` ${user.registration_rejection_note}`
                  : '';
                throw new Error(`Your registration was not approved.${hint}`);
              }
              throw new Error(
                'Your account is pending approval by the platform team. You will be able to sign in after activation.'
              );
            }
            throw new Error('This account is inactive. Contact support if you need help.');
          }

          await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

          let fallbackTenantName = user.tenant_name;
          if (!fallbackTenantName) {
            if (user.role === 'employer') {
              if (user.email.includes('techcorp')) fallbackTenantName = 'TechCorp Solutions';
              else if (user.email.includes('infosys')) fallbackTenantName = 'Infosys Limited';
              else fallbackTenantName = 'Corporate Partner';
            } else if (user.role === 'college_admin') {
              if (user.email.includes('iitm')) fallbackTenantName = 'IIT Madras';
              else if (user.email.includes('nitt')) fallbackTenantName = 'NIT Trichy';
              else fallbackTenantName = 'College Admin';
            }
          }

          const brandLogoUrl =
            user.role === 'employer'
              ? user.employer_logo_url || null
              : user.tenant_logo_url || null;

          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name || ''}`.trim(),
            role: user.role,
            tenantId: user.tenant_id,
            tenantName: fallbackTenantName,
            tenantSlug: user.tenant_slug,
            avatar: user.avatar_url,
            brandLogoUrl,
            studentPlacementVerified:
              user.role === 'student'
                ? Boolean(user.student_placement_verified) || SEED_DEMO_STUDENT_USER_IDS.has(user.id)
                : undefined,
          };
        } catch (error) {
          console.error('Authentication error:', error.message);
          throw new Error(error.message);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.tenantSlug = user.tenantSlug;
        token.avatar = user.avatar;
        token.logoUrl = user.avatar;
        token.brandLogoUrl = user.brandLogoUrl ?? null;
        token.studentPlacementVerified = user.studentPlacementVerified;
      }
      if (trigger === 'update' && session?.avatar !== undefined) {
        token.avatar = session.avatar;
        token.logoUrl = session.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.tenant_id = token.tenantId ?? null;
        session.user.tenantName = token.tenantName;
        session.user.tenantSlug = token.tenantSlug;
        session.user.avatar = token.avatar;
        session.user.logoUrl = token.logoUrl;
        session.user.brandLogoUrl = token.brandLogoUrl ?? null;
        session.user.studentPlacementVerified = token.studentPlacementVerified;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
