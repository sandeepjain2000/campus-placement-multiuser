import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import { buildLlmAttemptChain, getLlmChatConfig, llmConfigurationHint } from '@/lib/llmChatConfig';
import { suggestSkillsFromResumeText } from '@/lib/suggestSkillsFromResume';
import { suggestSkillsWithOpenAI } from '@/lib/suggestSkillsFromResumeOpenai';
import { loadStudentResumeSkillContext } from '@/lib/studentResumeSkillContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function mergeSuggestions(existing, ...lists) {
  const have = new Set(existing.map((s) => String(s).toLowerCase()));
  const out = [];
  for (const list of lists) {
    for (const skill of list || []) {
      const key = String(skill || '').trim();
      if (!key) continue;
      const lower = key.toLowerCase();
      if (have.has(lower)) continue;
      out.push(key);
      have.add(lower);
      if (out.length >= 12) return out;
    }
  }
  return out;
}

async function __platform_POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const pastedText = String(body?.text || '').trim();

    let skills = [];
    let resumeUrl = '';
    let cvExtract = null;
    let profileText = '';
    const llmConfig = getLlmChatConfig();
    let aiConfigured = llmConfig.configured;
    let aiProvider = llmConfig.provider;
    let aiLabel = llmConfig.label;

    if (pastedText) {
      const current = await query(
        `SELECT skill_name FROM student_skills WHERE student_id = $1::uuid ORDER BY created_at ASC`,
        [studentId],
      );
      skills = current.rows.map((r) => r.skill_name).filter(Boolean);
    } else {
      const ctx = await loadStudentResumeSkillContext(studentId);
      skills = ctx.skills;
      resumeUrl = ctx.resumeUrl;
      cvExtract = ctx.cvExtract;
      profileText = ctx.profileText;
      aiConfigured = ctx.aiConfigured;
      aiProvider = ctx.aiProvider ?? aiProvider;
      aiLabel = ctx.aiLabel ?? aiLabel;
    }

    const chain = buildLlmAttemptChain();
    const meta = {
      aiConfigured,
      aiProvider,
      aiLabel,
      nvidiaKeyCount: chain.filter((a) => a.provider === 'nvidia').length,
      totalKeysAvailable: chain.length,
      aiUsed: false,
      keysTried: null,
      textSource: pastedText ? 'pasted' : null,
      textLength: 0,
      resumePresent: Boolean(resumeUrl || pastedText),
      cvExtractCode: cvExtract && !cvExtract.ok ? cvExtract.code : null,
    };

    if (!pastedText && !resumeUrl) {
      return NextResponse.json({
        ok: false,
        suggestions: [],
        failure: {
          code: 'no_resume',
          message: 'Upload a primary CV on your profile first, then try again.',
        },
        meta: { ...meta, textSource: 'none' },
      });
    }

    let resumeText = pastedText;
    const warnings = [];

    if (!pastedText) {
      if (cvExtract?.ok) {
        resumeText = cvExtract.text;
        meta.textSource = 'cv';
      } else if (cvExtract && !cvExtract.ok) {
        warnings.push(cvExtract.message);
        if (cvExtract.detail && process.env.NODE_ENV !== 'production') {
          warnings.push(`Details: ${cvExtract.detail}`);
        }
      }

      if (!resumeText && profileText) {
        resumeText = profileText;
        meta.textSource = 'profile';
        if (cvExtract && !cvExtract.ok) {
          warnings.push('Used your profile text (projects, bio) because the CV file could not be read.');
        }
      }
    }

    meta.textLength = resumeText.length;

    if (!resumeText.trim()) {
      const failureMessage =
        cvExtract && !cvExtract.ok
          ? cvExtract.message
          : 'No readable text found in your CV or profile. Add projects/bio on your profile, or upload a text-based PDF or Word file.';

      return NextResponse.json({
        ok: false,
        suggestions: [],
        failure: {
          code: cvExtract?.code || 'no_text',
          message: failureMessage,
        },
        warnings,
        meta,
      });
    }

    const keywordSuggestions = suggestSkillsFromResumeText(resumeText, skills);
    let aiSuggestions = [];
    let aiError = null;

    if (aiConfigured) {
      const ai = await suggestSkillsWithOpenAI(resumeText, skills);
      aiSuggestions = ai.skills;
      aiError = ai.error;
      if (ai.provider) {
        meta.aiProvider = ai.provider;
        meta.aiLabel = ai.provider === 'nvidia' ? 'NVIDIA NIM' : 'OpenAI';
      }
      if (ai.keysTried != null) meta.keysTried = ai.keysTried;
      if (aiSuggestions.length) meta.aiUsed = true;
    }

    const suggestions = mergeSuggestions(skills, keywordSuggestions, aiSuggestions);

    if (!suggestions.length) {
      const parts = [
        'No new skill tags matched your CV.',
        'This uses keyword matching from a fixed list (not full AI parsing).',
      ];
      if (!aiConfigured) {
        parts.push(llmConfigurationHint());
      } else if (aiError) {
        parts.push(`AI extraction failed: ${aiError}`);
      } else if (aiConfigured && !meta.aiUsed) {
        parts.push('AI ran but did not return additional tags — try adding skills manually.');
      }
      if (cvExtract?.ok && meta.textLength < 80) {
        parts.push('Very little text was read from your CV; the file may be poorly formatted or image-only.');
      }

      return NextResponse.json({
        ok: false,
        suggestions: [],
        failure: {
          code: 'no_matches',
          message: parts.join(' '),
        },
        warnings,
        meta,
      });
    }

    const method =
      meta.aiUsed && keywordSuggestions.length
        ? 'keywords and AI'
        : meta.aiUsed
          ? 'AI'
          : 'keyword matching';

    return NextResponse.json({
      ok: true,
      suggestions,
      message: `Found ${suggestions.length} skill tag(s) using ${method}.`,
      warnings,
      meta,
    });
  } catch (e) {
    console.error('POST /api/student/profile/suggest-skills', e);
    return NextResponse.json(
      {
        error: 'Failed to suggest skills',
        failure: {
          code: 'server_error',
          message: e?.message || 'An unexpected server error occurred.',
        },
      },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_student_profile_suggest_skills' });
export const POST = __platformApiHandlers.POST;
