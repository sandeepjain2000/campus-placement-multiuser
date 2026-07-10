import sqlite3

db = r"c:\Users\sandeep\Downloads\Claudes\CampusPlacement\crm\crm.db"
conn = sqlite3.connect(db)
cur = conn.cursor()

eligible = cur.execute(
    """
    SELECT COUNT(*)
    FROM email_contacts
    WHERE status='Not Sent'
      AND COALESCE(zb_blocked,0)=0
      AND (LOWER(email_address) LIKE 'vc@%' OR LOWER(email_address) LIKE 'registrar@%')
    """
).fetchone()[0]

blocked = cur.execute(
    """
    SELECT COUNT(*)
    FROM email_contacts
    WHERE status='Not Sent'
      AND COALESCE(zb_blocked,0)=1
      AND (LOWER(email_address) LIKE 'vc@%' OR LOWER(email_address) LIKE 'registrar@%')
    """
).fetchone()[0]

print(f"eligible_unsent_vc_registrar={eligible}")
print(f"blocked_unsent_vc_registrar={blocked}")
conn.close()
