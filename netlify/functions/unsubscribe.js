exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;

  if (id) {
    try {
      await fetch(
        `${process.env.SUPABASE_URL || 'https://rofkgmwjggvxlgrdnsyt.supabase.co'}/rest/v1/leads?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZmtnbXdqZ2d2eGxncmRuc3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzA2MTgsImV4cCI6MjA4NzUwNjYxOH0.6nlnX-0wUlID-630j5fOyveEAG0Lrp2gWhgGMRKpmNk',
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZmtnbXdqZ2d2eGxncmRuc3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzA2MTgsImV4cCI6MjA4NzUwNjYxOH0.6nlnX-0wUlID-630j5fOyveEAG0Lrp2gWhgGMRKpmNk'}`,
          },
          body: JSON.stringify({ outreach_status: 'unsubscribed' }),
        }
      );
    } catch (err) {
      console.error('Unsubscribe error:', err);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unsubscribed</title></head>
<body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;">
<div style="text-align:center;background:#fff;padding:48px;border-radius:12px;max-width:400px;">
  <h1 style="font-size:24px;color:#333;margin:0 0 16px;">הוסרת מהרשימה</h1>
  <p style="color:#666;font-size:14px;line-height:1.6;">לא תקבל/י יותר הודעות מאיתנו.<br>אם זו טעות, צרו קשר: hello@getmizra.com</p>
  <a href="https://getmizra.com" style="display:inline-block;margin-top:24px;color:#F97316;text-decoration:none;font-weight:bold;">חזרה לאתר</a>
</div>
</body></html>`,
  };
};
