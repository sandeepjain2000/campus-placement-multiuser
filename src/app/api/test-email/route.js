import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/zeptomail';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    await sendEmail({
      to: 'sandeepjain200019@gmail.com',
      subject: 'ZeptoMail Test from PlacementHub',
      html: `
        <h2>Congratulations!</h2>
        <p>Your ZeptoMail integration with PlacementHub is working successfully.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully.',
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error?.response?.data || error?.response || error?.message,
      },
      { status: 500 },
    );
  }
}
