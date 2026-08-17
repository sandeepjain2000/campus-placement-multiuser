import csv
import sqlite3
from pathlib import Path

db = Path(r"c:\Users\sandeep\Downloads\Claudes\CampusPlacement\crm\crm.db")
out = Path(r"c:\Users\sandeep\Downloads\Claudes\CampusPlacement\crm\generic_unsent_vc_registrar_emails.csv")

conn = sqlite3.connect(db)
cur = conn.cursor()
rows = cur.execute(
    """
    SELECT email_address, institute_sr_no, email_seq, status
    FROM email_contacts
    WHERE status = 'Not Sent'
      AND (
        LOWER(email_address) LIKE 'vc@%'
        OR LOWER(email_address) LIKE 'registrar@%'
      )
    ORDER BY institute_sr_no, email_seq
    """
).fetchall()
conn.close()

out.parent.mkdir(parents=True, exist_ok=True)
with out.open("w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["email_address", "institute_sr_no", "email_seq", "status"])
    writer.writerows(rows)

print(out)
print(len(rows))
